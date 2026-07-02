export const WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"] as const;

export type WorkMode = (typeof WORK_MODES)[number];

export function isWorkMode(value: string): value is WorkMode {
  return (WORK_MODES as readonly string[]).includes(value);
}
