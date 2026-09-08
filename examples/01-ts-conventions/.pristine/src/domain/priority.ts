// Numeric values, because the database column is a smallint. There is no
// Postgres enum type for this one.
export enum Priority {
  Low,
  Normal,
  High,
  Urgent,
}

// A numeric enum carries a reverse map, so Priority[2] returns 'High'.
export function priorityName(value: Priority): string {
  return Priority[value];
}

export function isPriority(v: unknown): v is Priority {
  return typeof v === 'number' && v in Priority;
}
