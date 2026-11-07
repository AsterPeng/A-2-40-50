import { describe, expect, it } from 'vitest';
import { HttpA5TrackClient } from '../../src/a5-client/http-a5-track-client.js';
import type { TrackBatch, TrackPoint } from '../../src/domain/track.js';
import {
  parseTrackBatchJson,
  parseTrackPoint,
} from '../../src/precision/track-batch-json.js';

const first = parseTrackPoint({
  timestamp: '2026-10-27T08:30:12.345Z',
  flightNumber: 'TEST001',
  position: { latitudeDeg: '-0.000e+2', longitudeDeg: '113.918500123456789' },
  altitudeFt: '12500.00',
  groundSpeedKt: '1E+02',
  source: 'synthetic',
});
const second = parseTrackPoint({
  ...first,
  flightNumber: 'TEST002',
  position: { latitudeDeg: '9e1', longitudeDeg: '-1.8E+2' },
});
const batch: TrackBatch = { schemaVersion: '1.0', tracks: [first, second] };

function accepted(acceptedCount: number, rejected: unknown[] = []): Response {
  return new Response(
    JSON.stringify({ requestId: 'req-001', acceptedCount, rejected }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

function clientWith(response: () => Response): HttpA5TrackClient {
  return new HttpA5TrackClient({
    baseUrl: 'http://127.0.0.1:9055',
    fetchImpl: async () => response(),
  });
}

async function expectInvalidResponse(
  payload: unknown,
  submitted = batch,
): Promise<void> {
  const client = clientWith(
    () => new Response(JSON.stringify(payload), { status: 202 }),
  );
  expect(await client.postBatch(submitted)).toEqual({
    kind: 'failed',
    reason: 'invalid-response',
    attempts: 1,
    uncertain: true,
    httpStatus: 202,
  });
}

describe('RQ-A-2-50 HTTP client normal write and response boundary', () => {
  it('IT-C-50-01 posts one track as a batch with stable headers and untouched measurement text', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const client = new HttpA5TrackClient({
      baseUrl: 'http://127.0.0.1:9055',
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init });
        return accepted(1);
      },
    });

    expect((await client.postOne(first)).kind).toBe('accepted');
    expect((await client.postOne(first)).kind).toBe('accepted');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe('http://127.0.0.1:9055/v1/tracks');
    expect(calls[0]?.init?.method).toBe('POST');
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Idempotency-Key')).toMatch(/^a2-[A-Za-z0-9_-]{43}$/);
    expect(new Headers(calls[1]?.init?.headers).get('Idempotency-Key')).toBe(
      headers.get('Idempotency-Key'),
    );
    expect(calls[1]?.init?.body).toBe(calls[0]?.init?.body);
    const sent = parseTrackBatchJson(calls[0]?.init?.body);
    expect(sent.tracks).toHaveLength(1);
    expect(sent.tracks[0]?.position.longitudeDeg).toBe('113.918500123456789');
    expect(sent.tracks[0]?.altitudeFt).toBe('12500.00');
    expect(sent.tracks[0]?.position.latitudeDeg).toBe('-0.000e+2');
    expect(sent.tracks[0]?.groundSpeedKt).toBe('1E+02');
  });

  it('IT-C-50-02 accepts a valid two-track 202 response', async () => {
    const client = clientWith(() => accepted(2));
    expect(await client.postBatch(batch)).toEqual({
      kind: 'accepted',
      requestId: 'req-001',
      acceptedCount: 2,
      rejected: [],
    });
  });

  it('IT-C-50-14 returns accepted count and rejection indexes for a partial 202', async () => {
    const rejected = [
      { index: 1, code: 'DUPLICATE', message: 'synthetic rejection' },
    ];
    const client = clientWith(() => accepted(1, rejected));
    expect(await client.postBatch(batch)).toEqual({
      kind: 'partial',
      requestId: 'req-001',
      acceptedCount: 1,
      rejected,
    });
  });

  it('IT-C-50-24 rejects missing, extra, and nonstring input fields before fetch', async () => {
    let fetchCount = 0;
    const client = new HttpA5TrackClient({
      baseUrl: 'http://127.0.0.1:9055',
      fetchImpl: async () => {
        fetchCount += 1;
        return accepted(1);
      },
    });
    const malformed: unknown[] = [
      { tracks: [first] },
      { schemaVersion: '1.0', tracks: [{ ...first, altitudeFt: 12500 }] },
      { schemaVersion: '1.0', tracks: [{ ...first, extra: 'unexpected' }] },
      {
        schemaVersion: '1.0',
        tracks: [
          { ...first, position: { ...first.position, latitudeDeg: 91 } },
        ],
      },
    ];
    for (const value of malformed) {
      expect(await client.postBatch(value as TrackBatch)).toEqual({
        kind: 'failed',
        reason: 'invalid-request',
        attempts: 0,
        uncertain: false,
      });
    }
    expect(
      await client.postOne({
        ...first,
        altitudeFt: 12,
      } as unknown as TrackPoint),
    ).toMatchObject({
      kind: 'failed',
      reason: 'invalid-request',
      attempts: 0,
    });
    expect(fetchCount).toBe(0);
  });

  it('IT-C-50-25 rejects 202 counts outside range or violating conservation', async () => {
    for (const count of [-1, 0, 1, 3, 1.5]) {
      await expectInvalidResponse({
        requestId: 'req-001',
        acceptedCount: count,
        rejected: [],
      });
    }
  });

  it('IT-C-50-26 rejects duplicate, out-of-range, and noninteger rejection indexes', async () => {
    for (const indexes of [
      [0, 0],
      [0, 2],
      [0, 0.5],
      [0, -1],
    ]) {
      await expectInvalidResponse({
        requestId: 'req-001',
        acceptedCount: 0,
        rejected: indexes.map((index) => ({
          index,
          code: 'REJECTED',
          message: 'synthetic',
        })),
      });
    }
  });

  it('IT-C-50-27 rejects missing, extra, wrong-type, and malformed 202 responses', async () => {
    const malformed: unknown[] = [
      { acceptedCount: 2, rejected: [] },
      { requestId: '', acceptedCount: 2, rejected: [] },
      { requestId: 'req-001', acceptedCount: '2', rejected: [] },
      { requestId: 'req-001', acceptedCount: 2, rejected: [], extra: true },
      {
        requestId: 'req-001',
        acceptedCount: 1,
        rejected: [{ index: 0, code: 'X' }],
      },
      {
        requestId: 'req-001',
        acceptedCount: 1,
        rejected: [{ index: 0, code: 1, message: 'X' }],
      },
    ];
    for (const payload of malformed) {
      await expectInvalidResponse(payload);
    }
    const client = clientWith(() => new Response('{', { status: 202 }));
    expect(await client.postBatch(batch)).toMatchObject({
      kind: 'failed',
      reason: 'invalid-response',
      attempts: 1,
      uncertain: true,
    });
  });

  it('IT-C-50-28 never treats an unlisted HTTP status as acceptance', async () => {
    let fetchCount = 0;
    const client = new HttpA5TrackClient({
      baseUrl: 'http://127.0.0.1:9055',
      fetchImpl: async () => {
        fetchCount += 1;
        return new Response('synthetic error', { status: 418 });
      },
    });
    expect(await client.postBatch(batch)).toEqual({
      kind: 'failed',
      reason: 'unexpected-status',
      attempts: 1,
      uncertain: true,
      httpStatus: 418,
    });
    expect(fetchCount).toBe(1);
  });

  it('IT-C-50-30 keeps all rejected entries when 202 accepts zero tracks', async () => {
    const rejected = [
      { index: 0, code: 'INVALID', message: 'synthetic first' },
      { index: 1, code: 'INVALID', message: 'synthetic second' },
    ];
    const client = clientWith(() => accepted(0, rejected));
    expect(await client.postBatch(batch)).toEqual({
      kind: 'partial',
      requestId: 'req-001',
      acceptedCount: 0,
      rejected,
    });
  });

  it('IT-C-50-31 rejects zero and more than 1000 tracks before fetch', async () => {
    let fetchCount = 0;
    const client = new HttpA5TrackClient({
      baseUrl: 'http://127.0.0.1:9055',
      fetchImpl: async () => {
        fetchCount += 1;
        return accepted(1);
      },
    });
    for (const tracks of [[], Array(1001).fill(first)]) {
      expect(
        await client.postBatch({ schemaVersion: '1.0', tracks }),
      ).toMatchObject({
        kind: 'failed',
        reason: 'invalid-request',
        attempts: 0,
      });
    }
    expect(fetchCount).toBe(0);
  });
});
