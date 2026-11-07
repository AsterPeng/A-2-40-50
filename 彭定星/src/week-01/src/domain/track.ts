declare const decimalStringBrand: unique symbol;
declare const utcIso8601TimestampBrand: unique symbol;

export type DecimalString = string & {
  readonly [decimalStringBrand]: true;
};

export type UtcIso8601Timestamp = string & {
  readonly [utcIso8601TimestampBrand]: true;
};

export interface TrackPoint {
  readonly timestamp: UtcIso8601Timestamp;
  readonly flightNumber: string;
  readonly position: {
    readonly latitudeDeg: DecimalString;
    readonly longitudeDeg: DecimalString;
  };
  readonly altitudeFt: DecimalString;
  readonly groundSpeedKt: DecimalString;
  readonly source: string;
}

export interface TrackBatch {
  readonly schemaVersion: '1.0';
  readonly tracks: readonly TrackPoint[];
}
