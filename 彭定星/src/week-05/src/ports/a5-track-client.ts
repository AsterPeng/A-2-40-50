import type { TrackBatch, TrackPoint } from '../domain/track.js';

export interface RejectedTrack {
  readonly index: number;
  readonly code: string;
  readonly message: string;
}

export type A5FailureReason =
  | 'invalid-request'
  | 'bad-request'
  | 'idempotency-conflict'
  | 'rate-limited'
  | 'unavailable'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'invalid-response'
  | 'unexpected-status';

export type A5WriteResult =
  | {
      readonly kind: 'accepted' | 'partial';
      readonly requestId: string;
      readonly acceptedCount: number;
      readonly rejected: readonly RejectedTrack[];
    }
  | {
      readonly kind: 'failed';
      readonly reason: A5FailureReason;
      readonly attempts: number;
      readonly uncertain: boolean;
      readonly httpStatus?: number;
    };

export interface A5TrackClient {
  postOne(track: TrackPoint, signal?: AbortSignal): Promise<A5WriteResult>;
  postBatch(batch: TrackBatch, signal?: AbortSignal): Promise<A5WriteResult>;
}
