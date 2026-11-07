import type {
  TrackBatch,
  TrackPoint,
  UtcIso8601Timestamp,
} from '../domain/track.js';
import {
  parseDecimalString,
  parseLatitude,
  parseLongitude,
} from './decimal-string.js';

const TIMESTAMP_SYNTAX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const BATCH_KEYS = ['schemaVersion', 'tracks'] as const;
const TRACK_KEYS = [
  'timestamp',
  'flightNumber',
  'position',
  'altitudeFt',
  'groundSpeedKt',
  'source',
] as const;
const POSITION_KEYS = ['latitudeDeg', 'longitudeDeg'] as const;

function exactRecord(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Expected an object');
  }
  const actualKeys = Reflect.ownKeys(input);
  if (
    actualKeys.length !== keys.length ||
    !keys.every((key) => Object.hasOwn(input, key))
  ) {
    throw new TypeError('Object fields do not match the contract');
  }
  return input as Record<string, unknown>;
}

function parseTimestamp(input: unknown): UtcIso8601Timestamp {
  if (typeof input !== 'string' || !TIMESTAMP_SYNTAX.test(input)) {
    throw new TypeError('Timestamp must be UTC ISO 8601 with milliseconds');
  }
  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== input) {
    throw new TypeError('Timestamp is not a real UTC date and time');
  }
  return input as UtcIso8601Timestamp;
}

function parseText(input: unknown, field: string): string {
  if (typeof input !== 'string') {
    throw new TypeError(`${field} must be a string`);
  }
  return input;
}

export function parseTrackPoint(input: unknown): TrackPoint {
  const track = exactRecord(input, TRACK_KEYS);
  const position = exactRecord(track.position, POSITION_KEYS);

  return {
    timestamp: parseTimestamp(track.timestamp),
    flightNumber: parseText(track.flightNumber, 'flightNumber'),
    position: {
      latitudeDeg: parseLatitude(position.latitudeDeg),
      longitudeDeg: parseLongitude(position.longitudeDeg),
    },
    altitudeFt: parseDecimalString(track.altitudeFt),
    groundSpeedKt: parseDecimalString(track.groundSpeedKt),
    source: parseText(track.source, 'source'),
  };
}

export function parseTrackBatch(input: unknown): TrackBatch {
  const batch = exactRecord(input, BATCH_KEYS);
  if (batch.schemaVersion !== '1.0') {
    throw new TypeError('Unsupported TrackBatch schema version');
  }
  if (
    !Array.isArray(batch.tracks) ||
    batch.tracks.length < 1 ||
    batch.tracks.length > 1000
  ) {
    throw new RangeError('TrackBatch must contain 1 to 1000 tracks');
  }
  const tracks: TrackPoint[] = [];
  for (let index = 0; index < batch.tracks.length; index += 1) {
    if (!Object.hasOwn(batch.tracks, index)) {
      throw new TypeError('TrackBatch cannot contain empty track slots');
    }
    tracks.push(parseTrackPoint(batch.tracks[index]));
  }
  return {
    schemaVersion: '1.0',
    tracks,
  };
}

export function stringifyTrackBatch(input: unknown): string {
  return JSON.stringify(parseTrackBatch(input));
}

export function parseTrackBatchJson(input: unknown): TrackBatch {
  if (typeof input !== 'string') {
    throw new TypeError('TrackBatch JSON must be a string');
  }
  const decoded: unknown = JSON.parse(input);
  return parseTrackBatch(decoded);
}
