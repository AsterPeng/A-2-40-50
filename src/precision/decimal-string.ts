import type { DecimalString } from '../domain/track.js';

const DECIMAL_SYNTAX =
  /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/;

export function parseDecimalString(input: unknown): DecimalString {
  if (typeof input !== 'string' || !DECIMAL_SYNTAX.test(input)) {
    throw new TypeError('Measurement must be a decimal string');
  }
  return input as DecimalString;
}

function isWithinAbsoluteLimit(
  value: DecimalString,
  limit: '90' | '180',
): boolean {
  const match = DECIMAL_SYNTAX.exec(value);
  if (match === null) {
    throw new TypeError('Invalid decimal string');
  }

  const integer = match[2] ?? '';
  const coefficient = integer + (match[3] ?? '');
  const firstSignificantIndex = coefficient.search(/[1-9]/);
  if (firstSignificantIndex === -1) {
    return true;
  }

  // Compare scientific orders and coefficient digits without expanding the exponent.
  const exponent = match[4] === undefined ? 0n : BigInt(match[4]);
  const order = BigInt(integer.length - firstSignificantIndex - 1) + exponent;
  const limitOrder = BigInt(limit.length - 1);
  if (order !== limitOrder) {
    return order < limitOrder;
  }

  const digits = coefficient.slice(firstSignificantIndex);
  for (
    let index = 0;
    index < digits.length || index < limit.length;
    index += 1
  ) {
    const digit = digits[index] ?? '0';
    const limitDigit = limit[index] ?? '0';
    if (digit !== limitDigit) {
      return digit < limitDigit;
    }
  }
  return true;
}

export function parseLatitude(input: unknown): DecimalString {
  const value = parseDecimalString(input);
  if (!isWithinAbsoluteLimit(value, '90')) {
    throw new RangeError('Latitude is outside [-90, 90]');
  }
  return value;
}

export function parseLongitude(input: unknown): DecimalString {
  const value = parseDecimalString(input);
  if (!isWithinAbsoluteLimit(value, '180')) {
    throw new RangeError('Longitude is outside [-180, 180]');
  }
  return value;
}
