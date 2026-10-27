import { describe, expect, it } from 'vitest';
import {
  parseDecimalString,
  parseLatitude,
  parseLongitude,
} from '../../src/precision/decimal-string.js';

describe('RQ-A-2-40 decimal text', () => {
  it('UT-C-40-01 retains every character of valid measurements', () => {
    const values = [
      '113.918500123456789',
      '12500.00',
      '1E-20',
      '1e+000020',
      '-0',
      '-0.000e+2',
      '0',
    ];

    for (const value of values) {
      expect(parseDecimalString(value)).toBe(value);
    }
  });

  it('UT-C-40-02 rejects nonstrings and invalid decimal syntax', () => {
    const invalid: unknown[] = [
      113.918500123456789,
      null,
      undefined,
      '',
      ' 1',
      '1 ',
      '+1',
      '01',
      '-01',
      '.5',
      '1.',
      '1e',
      '1e+',
      'NaN',
      'Infinity',
      '0x10',
      '1_000',
      '1\n',
    ];

    for (const value of invalid) {
      expect(() => parseDecimalString(value)).toThrow();
    }
  });

  it('UT-C-40-03 checks coordinate limits without losing decimal precision', () => {
    const validLatitudes = [
      '-90',
      '90',
      '90.000000000000000000000',
      '9e1',
      '-900e-1',
      '-0e+999999',
      '89.999999999999999999999999999999',
    ];
    const validLongitudes = [
      '-180',
      '180',
      '1.8E+2',
      '-180.000000000000000000',
      '179.99999999999999999999999999999',
    ];

    for (const value of validLatitudes) {
      expect(parseLatitude(value)).toBe(value);
    }
    for (const value of validLongitudes) {
      expect(parseLongitude(value)).toBe(value);
    }
    for (const value of [
      '90.000000000000000000000000000001',
      '-90.000000000000000000000000000001',
      '9.00000000000000000000001e1',
      '1e999999',
      '-1e999999',
    ]) {
      expect(() => parseLatitude(value)).toThrow();
    }
    for (const value of [
      '180.0000000000000000000000001',
      '-181',
      '1.80000000000000000001e2',
    ]) {
      expect(() => parseLongitude(value)).toThrow();
    }
  });
});
