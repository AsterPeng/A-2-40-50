import { describe, expect, it } from 'vitest';
import {
  parseTrackBatch,
  parseTrackBatchJson,
  stringifyTrackBatch,
} from '../../src/precision/track-batch-json.js';

const firstTrack = {
  timestamp: '2026-10-27T08:30:12.345Z',
  flightNumber: 'TEST001',
  position: {
    latitudeDeg: '-0.000e+2',
    longitudeDeg: '113.918500123456789',
  },
  altitudeFt: '12500.00',
  groundSpeedKt: '1E+02',
  source: 'synthetic',
};

const secondTrack = {
  ...firstTrack,
  flightNumber: 'TEST002',
  position: { latitudeDeg: '9e1', longitudeDeg: '-1.8E+2' },
};

describe('RQ-A-2-40 TrackBatch JSON boundary', () => {
  it('UT-C-40-04 preserves measurement characters and track order through JSON', () => {
    const input: unknown = {
      schemaVersion: '1.0',
      tracks: [firstTrack, secondTrack],
    };
    const batch = parseTrackBatch(input);
    const json = stringifyTrackBatch(batch);
    const decoded = parseTrackBatchJson(json);

    expect(decoded).toEqual(batch);
    expect(decoded.tracks.map((track) => track.flightNumber)).toEqual([
      'TEST001',
      'TEST002',
    ]);
    expect(decoded.tracks[0]?.position.longitudeDeg).toBe(
      '113.918500123456789',
    );
    expect(decoded.tracks[0]?.altitudeFt).toBe('12500.00');
    expect(decoded.tracks[0]?.position.latitudeDeg).toBe('-0.000e+2');
    expect(decoded.tracks[0]?.groundSpeedKt).toBe('1E+02');
    expect(JSON.parse(json)).toEqual(input);
    expect(json).toContain('"113.918500123456789"');
    expect(json).toContain('"12500.00"');
    expect(json).toContain('"-0.000e+2"');
    expect(json).toContain('"1E+02"');

    const malformed: unknown[] = [
      { schemaVersion: '1.0', tracks: [] },
      { schemaVersion: '1.0', tracks: Array(1) },
      { tracks: [firstTrack] },
      { schemaVersion: '2.0', tracks: [firstTrack] },
      { schemaVersion: '1.0', tracks: [{ ...firstTrack, altitudeFt: 12500 }] },
      {
        schemaVersion: '1.0',
        tracks: [
          {
            ...firstTrack,
            position: { ...firstTrack.position, longitudeDeg: 113.9 },
          },
        ],
      },
      { schemaVersion: '1.0', tracks: [{ ...firstTrack, source: undefined }] },
      {
        schemaVersion: '1.0',
        tracks: [{ ...firstTrack, extra: 'not allowed' }],
      },
      {
        schemaVersion: '1.0',
        tracks: [
          {
            ...firstTrack,
            position: { ...firstTrack.position, extra: 'not allowed' },
          },
        ],
      },
      {
        schemaVersion: '1.0',
        tracks: [{ ...firstTrack, timestamp: '2026-02-30T08:30:12.345Z' }],
      },
      { schemaVersion: '1.0', tracks: Array(1001).fill(firstTrack) },
    ];
    for (const value of malformed) {
      expect(() => parseTrackBatch(value)).toThrow();
    }
    expect(() => parseTrackBatchJson('{"schemaVersion":"1.0",')).toThrow();
    expect(() =>
      parseTrackBatchJson(
        JSON.stringify({
          schemaVersion: '1.0',
          tracks: [{ ...firstTrack, altitudeFt: 12500 }],
        }),
      ),
    ).toThrow();
  });
});
