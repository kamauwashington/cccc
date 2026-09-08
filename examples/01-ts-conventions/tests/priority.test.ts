import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  PRIORITIES,
  PRIORITY_NAMES,
  Priority,
  isPriority,
  priorityName,
} from '../src/domain/priority';

describe('Priority', () => {
  it('is a union of number literals', () => {
    expectTypeOf<Priority>().toEqualTypeOf<0 | 1 | 2 | 3>();
    expectTypeOf(Priority.High).toEqualTypeOf<2>();
  });

  it('accepts a plain number literal where the type is expected', () => {
    const p: Priority = 3;
    expect(p).toBe(Priority.Urgent);
  });

  it('rejects a number that is not a member', () => {
    // @ts-expect-error 4 is not a Priority
    const p: Priority = 4;
    expect(isPriority(p)).toBe(false);
  });

  it('replaces the reverse mapping a numeric enum used to give for free', () => {
    expect(priorityName(2)).toBe('High');
    expect(PRIORITY_NAMES).toEqual({ 0: 'Low', 1: 'Normal', 2: 'High', 3: 'Urgent' });
  });

  it('lists every value in declaration order', () => {
    expect(PRIORITIES).toEqual([0, 1, 2, 3]);
    expect(PRIORITIES).toEqual(Object.values(Priority));
  });
});
