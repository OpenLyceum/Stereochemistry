/** Fail immediately when a static fixture lookup or indexed assertion has no value. */
export function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) {
    throw new Error("Missing test fixture value");
  }
  return value;
}
