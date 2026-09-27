import { z } from 'zod';

// Empty-string form values (e.g. an unselected "No one" <option value="">) must become
// null *before* uuid validation runs, otherwise z.string().uuid() rejects "" first and
// the fallback-to-null transform never gets a chance to run.
export const optionalUuid = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().uuid().nullable().optional(),
);

export function optionalText(maxLength: number) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(maxLength).nullable().optional(),
  );
}

export function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
