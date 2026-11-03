import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpA5TrackClient } from '../../src/a5-client/http-a5-track-client.js';
import type { TrackBatch } from '../../src/domain/track.js';
import { parseTrackPoint } from '../../src/precision/track-batch-json.js';

const track = parseTrackPoint({
  timestamp: '2026-10-27T08:30:12.345Z',
  flightNumber: 'TEST001',
  position: { latitudeDeg: '-0.000e+2', longitudeDeg: '113.918500123456789' },
  altitudeFt: '12500.00',
  groundSpeedKt: '1E+02',
  source: 'synthetic',
});
const batch: TrackBatch = { schemaVersion: '1.0', tracks: [track] };
const origin = 'http://127.0.0.1:9055';
const accepted = (): Response =>
  new Response(
    JSON.stringify({ requestId: 'req-001', acceptedCount: 1, rejected: [] }),
    {
      status: 202,
    },
  );
const error = (status: number, retryAfter?: string): Response =>
  new Response('external secret response', {
    status,
    ...(retryAfter === undefined
      ? {}
      : { headers: { 'Retry-After': retryAfter } }),
  });

afterEach(() => vi.useRealTimers());

describe('RQ-A-2-50 HTTP client reliability', () => {
  it.each([
    ['IT-C-50-03', 400, 'bad-request'],
    ['IT-C-50-04', 409, 'idempotency-conflict'],
  ])('%s treats HTTP %i as permanent failure', async (_id, status, reason) => {
    const fetchImpl = vi.fn(async () => error(status));
    const client = new HttpA5TrackClient({ baseUrl: origin, fetchImpl });
    expect(await client.postBatch(batch)).toMatchObject({
      kind: 'failed',
      reason,
      attempts: 1,
      uncertain: false,
      httpStatus: status,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('IT-C-50-05 uses Retry-After seconds for 429 before retrying', async () => {
    const delays: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(error(429, '2'))
      .mockResolvedValueOnce(accepted());
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    expect((await client.postBatch(batch)).kind).toBe('accepted');
    expect(delays).toEqual([2000]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('IT-C-50-05 caps a long Retry-After at the configured maximum', async () => {
    const delays: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(error(429, '200'))
      .mockResolvedValueOnce(accepted());
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      maxDelayMs: 500,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    expect((await client.postBatch(batch)).kind).toBe('accepted');
    expect(delays).toEqual([500]);
  });

  it('IT-C-50-06 retries 503 with bounded exponential backoff', async () => {
    const delays: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(error(503))
      .mockResolvedValueOnce(error(503))
      .mockResolvedValueOnce(accepted());
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      baseDelayMs: 100,
      maxDelayMs: 150,
      random: () => 1,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    expect((await client.postBatch(batch)).kind).toBe('accepted');
    expect(delays).toEqual([100, 150]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('IT-C-50-12 returns an uncertain timeout without retry by default', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      async (): Promise<Response> => new Promise(() => {}),
    );
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      timeoutMs: 10,
    });
    const pending = client.postBatch(batch);
    await vi.advanceTimersByTimeAsync(10);
    expect(await pending).toMatchObject({
      kind: 'failed',
      reason: 'timeout',
      attempts: 1,
      uncertain: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('IT-C-50-13 sends identical body bytes and idempotency key on retries', async () => {
    const calls: RequestInit[] = [];
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      sleep: async () => {},
      fetchImpl: async (_input, init) => {
        calls.push(init ?? {});
        return calls.length === 1 ? error(503) : accepted();
      },
    });
    expect((await client.postBatch(batch)).kind).toBe('accepted');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.body).toBe(calls[1]?.body);
    expect(new Headers(calls[0]?.headers).get('Idempotency-Key')).toBe(
      new Headers(calls[1]?.headers).get('Idempotency-Key'),
    );
    expect(String(calls[0]?.body)).toContain('113.918500123456789');
  });

  it('IT-C-50-15 emits only redacted failure fields', async () => {
    const records: unknown[] = [];
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl: async () => {
        throw new Error('token=secret longitude=113.918500123456789');
      },
      maxAttempts: 1,
      onFailure: (record) => {
        records.push(record);
      },
    });
    expect((await client.postBatch(batch)).kind).toBe('failed');
    expect(records).toEqual([
      {
        reason: 'network',
        attempts: 1,
        trackCount: 1,
        uncertain: true,
      },
    ]);
    expect(JSON.stringify(records)).not.toMatch(
      /secret|longitude|113\.9185|external/,
    );
  });

  it('IT-C-50-16 retries one network error within the attempt limit', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(accepted());
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      sleep: async () => {},
    });
    expect((await client.postBatch(batch)).kind).toBe('accepted');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('IT-C-50-17 stops an in-flight request when the caller cancels', async () => {
    const controller = new AbortController();
    let started!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      started();
      return new Promise(() => {});
    });
    const client = new HttpA5TrackClient({ baseUrl: origin, fetchImpl });
    const pending = client.postBatch(batch, controller.signal);
    await fetchStarted;
    controller.abort();
    expect(await pending).toMatchObject({
      kind: 'failed',
      reason: 'cancelled',
      attempts: 1,
      uncertain: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('IT-C-50-17 does not start a fetch cancelled before dispatch', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async () => accepted());
    const client = new HttpA5TrackClient({ baseUrl: origin, fetchImpl });
    const pending = client.postBatch(batch, controller.signal);
    controller.abort();
    expect(await pending).toMatchObject({
      kind: 'failed',
      reason: 'cancelled',
      attempts: 0,
      uncertain: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('IT-C-50-18 falls back to backoff for invalid Retry-After', async () => {
    const delays: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(error(429, 'not-a-date'))
      .mockResolvedValueOnce(accepted());
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      baseDelayMs: 120,
      random: () => 1,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    expect((await client.postBatch(batch)).kind).toBe('accepted');
    expect(delays).toEqual([120]);
  });

  it.each([429, 503])(
    'IT-C-50-19 stops HTTP %i after the configured attempts',
    async (status) => {
      const fetchImpl = vi.fn(async () => error(status));
      const client = new HttpA5TrackClient({
        baseUrl: origin,
        fetchImpl,
        maxAttempts: 2,
        sleep: async () => {},
      });
      expect(await client.postBatch(batch)).toMatchObject({
        kind: 'failed',
        attempts: 2,
        httpStatus: status,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    },
  );

  it('IT-C-50-29 interrupts a pending retry wait without a new request', async () => {
    const controller = new AbortController();
    let waiting!: () => void;
    const waitStarted = new Promise<void>((resolve) => {
      waiting = resolve;
    });
    const fetchImpl = vi.fn(async () => error(503));
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      sleep: async () => {
        waiting();
        await new Promise<void>(() => {});
      },
    });
    const pending = client.postBatch(batch, controller.signal);
    await waitStarted;
    controller.abort();
    expect(await pending).toMatchObject({
      kind: 'failed',
      reason: 'cancelled',
      attempts: 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('IT-C-50-32 bounds timeout retries and keeps the result uncertain', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      async (): Promise<Response> => new Promise(() => {}),
    );
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      timeoutMs: 10,
      retryTimeout: true,
      maxAttempts: 2,
      baseDelayMs: 0,
      sleep: async () => {},
    });
    const pending = client.postBatch(batch);
    await vi.advanceTimersByTimeAsync(30);
    expect(await pending).toMatchObject({
      kind: 'failed',
      reason: 'timeout',
      attempts: 2,
      uncertain: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('IT-C-50-33 uses an HTTP-date Retry-After relative to the injected clock', async () => {
    const delays: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(error(429, 'Tue, 27 Oct 2026 08:30:02 GMT'))
      .mockResolvedValueOnce(accepted());
    const client = new HttpA5TrackClient({
      baseUrl: origin,
      fetchImpl,
      now: () => Date.parse('Tue, 27 Oct 2026 08:30:00 GMT'),
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    expect((await client.postBatch(batch)).kind).toBe('accepted');
    expect(delays).toEqual([2000]);
  });
});
