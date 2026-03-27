/**
 * Shared generator options for snapshot-stable test output.
 * Overrides dateFn and version to prevent volatile data in snapshots.
 */
export const testOpts = { dateFn: (): string => "null", version: "test" } as const;
