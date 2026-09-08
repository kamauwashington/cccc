// Call this in the default branch of a switch over a union. If a new member is
// added and the switch does not handle it, the argument is no longer `never`
// and the compiler fails the build.
export function assertNever(value: never, label = 'value'): never {
  throw new Error(`Unhandled ${label}: ${String(value)}`);
}
