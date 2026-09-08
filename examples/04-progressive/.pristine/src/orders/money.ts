// Money in this project is always an integer number of cents.
// Floats lose pennies on division. Strings lose type safety.

/** An amount of money, stored as a whole number of cents. */
export type Cents = number;

export class MoneyError extends Error {}

export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Build a Cents value. Throws when the caller passes a float. */
export function cents(value: number): Cents {
  if (!isCents(value)) {
    throw new MoneyError(`money must be an integer number of cents, got ${value}`);
  }
  return value;
}

/** Turn a major unit amount (dollars) into cents. Rejects sub cent input. */
export function fromMajorUnits(value: number): Cents {
  const scaled = Math.round(value * 100);
  if (Math.abs(value * 100 - scaled) > 1e-9) {
    throw new MoneyError(`amount ${value} is smaller than one cent`);
  }
  return cents(scaled);
}

export function add(a: Cents, b: Cents): Cents {
  return cents(cents(a) + cents(b));
}

export function subtract(a: Cents, b: Cents): Cents {
  return cents(cents(a) - cents(b));
}

export function multiply(amount: Cents, quantity: number): Cents {
  if (!Number.isSafeInteger(quantity)) {
    throw new MoneyError(`quantity must be a whole number, got ${quantity}`);
  }
  return cents(cents(amount) * quantity);
}

export function sum(values: readonly Cents[]): Cents {
  return values.reduce<Cents>((total, value) => add(total, value), 0);
}

/** Split an amount into n parts with no pennies lost. */
export function allocate(amount: Cents, parts: number): Cents[] {
  if (parts < 1) throw new MoneyError('parts must be at least 1');
  const base = Math.trunc(cents(amount) / parts);
  const out = new Array<Cents>(parts).fill(base);
  let remainder = amount - base * parts;
  for (let i = 0; remainder !== 0; i = (i + 1) % parts) {
    const step = remainder > 0 ? 1 : -1;
    out[i] = out[i]! + step;
    remainder -= step;
  }
  return out;
}

/** Display only. Never feed the result back into a calculation. */
export function formatCents(amount: Cents): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(cents(amount));
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
