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

export interface HttpA5TrackClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
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

  constructor(options: HttpA5TrackClientOptions) {
    this.endpoint = endpointFor(options.baseUrl);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  postOne(track: TrackPoint, signal?: AbortSignal): Promise<A5WriteResult> {
    return this.postBatch({ schemaVersion: '1.0', tracks: [track] }, signal);
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
      return {
        kind: 'failed',
        reason: 'invalid-request',
        attempts: 0,
        uncertain: false,
      };
    }

    if (signal?.aborted) {
      return {
        kind: 'failed',
        reason: 'cancelled',
        attempts: 0,
        uncertain: false,
      };
    }

    const idempotencyKey = `a2-${createHash('sha256').update(body, 'utf8').digest('base64url')}`;
    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body,
        ...(signal === undefined ? {} : { signal }),
      });
    } catch {
      return {
        kind: 'failed',
        reason: signal?.aborted ? 'cancelled' : 'network',
        attempts: 1,
        uncertain: true,
      };
    }

    if (response.status !== 202) {
      return {
        kind: 'failed',
        reason: statusReason(response.status),
        attempts: 1,
        uncertain: ![400, 409, 429].includes(response.status),
        httpStatus: response.status,
      };
    }
    try {
      const payload: unknown = await response.json();
      return parseAcceptance(payload, submittedCount);
    } catch {
      return {
        kind: 'failed',
        reason: 'invalid-response',
        attempts: 1,
        uncertain: true,
        httpStatus: 202,
      };
    }
  }
}
