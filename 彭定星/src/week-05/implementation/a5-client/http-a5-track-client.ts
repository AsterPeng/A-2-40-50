import { createHash } from 'node:crypto';
import type { TrackBatch, TrackPoint } from '../domain/track.js';
import type {
  A5FailureReason,
  A5TrackClient,
  A5WriteResult,
} from '../ports/a5-track-client.js';
import {
  parseTrackBatch,
  stringifyTrackBatch,
} from '../precision/track-batch-json.js';
import { parseAcceptance } from './parse-acceptance.js';
import {
  abortable,
  defaultSleep,
  nonnegativeInteger,
  positiveInteger,
  retryAfterMs,
} from './reliability.js';

type Failure = Extract<A5WriteResult, { kind: 'failed' }>;

export interface A5FailureRecord {
  readonly reason: A5FailureReason;
  readonly attempts: number;
  readonly trackCount: number;
  readonly uncertain: boolean;
  readonly httpStatus?: number;
}

export interface HttpA5TrackClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly retryTimeout?: boolean;
  readonly now?: () => number;
  readonly random?: () => number;
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  readonly onFailure?: (record: A5FailureRecord) => void;
}

function endpointFor(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username !== '' ||
    url.password !== '' ||
    (url.pathname !== '' && url.pathname !== '/') ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new TypeError(
      'A-5 base URL must be an HTTP(S) origin without credentials',
    );
  }
  return new URL('/v1/tracks', url).toString();
}

function statusReason(status: number): A5FailureReason {
  switch (status) {
    case 400:
      return 'bad-request';
    case 409:
      return 'idempotency-conflict';
    case 429:
      return 'rate-limited';
    case 503:
      return 'unavailable';
    default:
      return 'unexpected-status';
  }
}

export class HttpA5TrackClient implements A5TrackClient {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly retryTimeout: boolean;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private readonly onFailure: ((record: A5FailureRecord) => void) | undefined;

  constructor(options: HttpA5TrackClientOptions) {
    this.endpoint = endpointFor(options.baseUrl);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = positiveInteger(options.timeoutMs ?? 10_000, 'timeoutMs');
    this.maxAttempts = positiveInteger(options.maxAttempts ?? 3, 'maxAttempts');
    this.baseDelayMs = nonnegativeInteger(
      options.baseDelayMs ?? 1_000,
      'baseDelayMs',
    );
    this.maxDelayMs = nonnegativeInteger(
      options.maxDelayMs ?? 30_000,
      'maxDelayMs',
    );
    this.retryTimeout = options.retryTimeout ?? false;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
    this.sleep = options.sleep ?? defaultSleep;
    this.onFailure = options.onFailure;
  }

  postOne(track: TrackPoint, signal?: AbortSignal): Promise<A5WriteResult> {
    return this.postBatch({ schemaVersion: '1.0', tracks: [track] }, signal);
  }

  private fail(failure: Failure, trackCount: number): Failure {
    try {
      this.onFailure?.({
        reason: failure.reason,
        attempts: failure.attempts,
        trackCount,
        uncertain: failure.uncertain,
        ...(failure.httpStatus === undefined
          ? {}
          : { httpStatus: failure.httpStatus }),
      });
    } catch {
      // A diagnostic sink cannot change the result of a write attempt.
    }
    return failure;
  }

  private backoffMs(attempts: number): number {
    const bounded = Math.min(
      this.baseDelayMs * 2 ** (attempts - 1),
      this.maxDelayMs,
    );
    const sample = this.random();
    const jitter = Number.isFinite(sample)
      ? Math.min(1, Math.max(0, sample))
      : 1;
    return Math.floor(bounded * (0.5 + jitter / 2));
  }

  private async sendAttempt(
    body: string,
    idempotencyKey: string,
    submittedCount: number,
    attempts: number,
    callerSignal?: AbortSignal,
  ): Promise<{ result: A5WriteResult; retryAfter: string | null }> {
    const controller = new AbortController();
    let timedOut = false;
    let dispatched = false;
    const onCallerAbort = (): void => controller.abort();
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    if (callerSignal?.aborted) controller.abort();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const interrupted = (): Failure => ({
      kind: 'failed',
      reason: callerSignal?.aborted
        ? 'cancelled'
        : timedOut
          ? 'timeout'
          : 'network',
      attempts: dispatched ? attempts : attempts - 1,
      uncertain: dispatched,
    });

    try {
      let response: Response;
      try {
        response = await abortable(
          Promise.resolve().then(() => {
            if (controller.signal.aborted) throw new Error('aborted');
            dispatched = true;
            return this.fetchImpl(this.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
              },
              body,
              signal: controller.signal,
            });
          }),
          controller.signal,
        );
      } catch {
        return { result: interrupted(), retryAfter: null };
      }

      if (callerSignal?.aborted || timedOut) {
        return { result: interrupted(), retryAfter: null };
      }
      if (response.status !== 202) {
        return {
          result: {
            kind: 'failed',
            reason: statusReason(response.status),
            attempts,
            uncertain: ![400, 409, 429].includes(response.status),
            httpStatus: response.status,
          },
          retryAfter:
            response.status === 429
              ? response.headers.get('Retry-After')
              : null,
        };
      }

      try {
        const payload: unknown = await abortable(
          response.json(),
          controller.signal,
        );
        return {
          result: parseAcceptance(payload, submittedCount),
          retryAfter: null,
        };
      } catch {
        return {
          result:
            callerSignal?.aborted || timedOut
              ? interrupted()
              : {
                  kind: 'failed',
                  reason: 'invalid-response',
                  attempts,
                  uncertain: true,
                  httpStatus: 202,
                },
          retryAfter: null,
        };
      }
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }

  async postBatch(
    batch: TrackBatch,
    signal?: AbortSignal,
  ): Promise<A5WriteResult> {
    let body: string;
    let submittedCount: number;
    try {
      const checked = parseTrackBatch(batch);
      body = stringifyTrackBatch(checked);
      submittedCount = checked.tracks.length;
    } catch {
      return this.fail(
        {
          kind: 'failed',
          reason: 'invalid-request',
          attempts: 0,
          uncertain: false,
        },
        0,
      );
    }

    if (signal?.aborted) {
      return this.fail(
        { kind: 'failed', reason: 'cancelled', attempts: 0, uncertain: false },
        submittedCount,
      );
    }

    const idempotencyKey = `a2-${createHash('sha256').update(body, 'utf8').digest('base64url')}`;
    let everUncertain = false;
    for (let attempts = 1; attempts <= this.maxAttempts; attempts += 1) {
      if (signal?.aborted) {
        return this.fail(
          {
            kind: 'failed',
            reason: 'cancelled',
            attempts: attempts - 1,
            uncertain: everUncertain,
          },
          submittedCount,
        );
      }
      const { result, retryAfter } = await this.sendAttempt(
        body,
        idempotencyKey,
        submittedCount,
        attempts,
        signal,
      );
      if (result.kind !== 'failed') return result;
      everUncertain ||= result.uncertain;
      if (signal?.aborted) {
        return this.fail(
          {
            kind: 'failed',
            reason: 'cancelled',
            attempts: result.attempts,
            uncertain: everUncertain,
          },
          submittedCount,
        );
      }
      const retryable =
        result.reason === 'rate-limited' ||
        result.reason === 'unavailable' ||
        result.reason === 'network' ||
        (result.reason === 'timeout' && this.retryTimeout);
      if (!retryable || attempts === this.maxAttempts) {
        return this.fail(
          { ...result, uncertain: everUncertain },
          submittedCount,
        );
      }
      const delay =
        result.reason === 'rate-limited'
          ? retryAfterMs(retryAfter, this.now(), this.maxDelayMs)
          : null;
      try {
        const waiting = this.sleep(delay ?? this.backoffMs(attempts), signal);
        if (signal === undefined) await waiting;
        else await abortable(waiting, signal);
      } catch {
        if (signal?.aborted) {
          return this.fail(
            {
              kind: 'failed',
              reason: 'cancelled',
              attempts,
              uncertain: everUncertain,
            },
            submittedCount,
          );
        }
        return this.fail(
          { ...result, uncertain: everUncertain },
          submittedCount,
        );
      }
    }
    throw new Error('Unreachable retry state');
  }
}
