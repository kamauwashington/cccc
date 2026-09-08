// Numeric values, because the database column is a smallint. There is no
// Postgres enum type for this one.
export const Priority = {
  Low: 0,
  Normal: 1,
  High: 2,
  Urgent: 3,
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

export type PriorityName = keyof typeof Priority;

export const PRIORITIES = Object.values(Priority) as [Priority, ...Priority[]];

// A numeric TypeScript enum gives you a free reverse map, so `Priority[2]`
// returns 'High'. A const object does not. Build the reverse map once here.
export const PRIORITY_NAMES = Object.fromEntries(
  Object.entries(Priority).map(([name, value]) => [value, name])
) as Record<Priority, PriorityName>;

export function priorityName(value: Priority): PriorityName {
  return PRIORITY_NAMES[value];
}

export function isPriority(v: unknown): v is Priority {
  return typeof v === 'number' && (PRIORITIES as readonly unknown[]).includes(v);
}
