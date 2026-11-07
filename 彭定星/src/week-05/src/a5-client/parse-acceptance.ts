import type { A5WriteResult, RejectedTrack } from '../ports/a5-track-client.js';

function exactRecord(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Expected an acceptance object');
  }
  if (
    Reflect.ownKeys(input).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(input, key))
  ) {
    throw new TypeError('Acceptance fields do not match the contract');
  }
  return input as Record<string, unknown>;
}

export function parseAcceptance(
  input: unknown,
  submittedCount: number,
): A5WriteResult {
  const acceptance = exactRecord(input, [
    'requestId',
    'acceptedCount',
    'rejected',
  ]);
  if (
    typeof acceptance.requestId !== 'string' ||
    acceptance.requestId.trim().length === 0
  ) {
    throw new TypeError('Acceptance requestId must be a nonempty string');
  }
  if (
    typeof acceptance.acceptedCount !== 'number' ||
    !Number.isInteger(acceptance.acceptedCount) ||
    acceptance.acceptedCount < 0 ||
    acceptance.acceptedCount > submittedCount
  ) {
    throw new TypeError('Acceptance count is invalid');
  }
  if (!Array.isArray(acceptance.rejected)) {
    throw new TypeError('Rejected tracks must be an array');
  }

  const rejected: RejectedTrack[] = [];
  const indexes = new Set<number>();
  for (const item of acceptance.rejected as unknown[]) {
    const entry = exactRecord(item, ['index', 'code', 'message']);
    if (
      typeof entry.index !== 'number' ||
      !Number.isInteger(entry.index) ||
      entry.index < 0 ||
      entry.index >= submittedCount ||
      indexes.has(entry.index) ||
      typeof entry.code !== 'string' ||
      typeof entry.message !== 'string'
    ) {
      throw new TypeError('Rejected track entry is invalid');
    }
    indexes.add(entry.index);
    rejected.push({
      index: entry.index,
      code: entry.code,
      message: entry.message,
    });
  }
  if (acceptance.acceptedCount + rejected.length !== submittedCount) {
    throw new TypeError('Acceptance count does not match rejected tracks');
  }

  return {
    kind: rejected.length === 0 ? 'accepted' : 'partial',
    requestId: acceptance.requestId,
    acceptedCount: acceptance.acceptedCount,
    rejected,
  };
}
