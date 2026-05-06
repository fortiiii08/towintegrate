import { getHolidaySet, isNonWorkingDay } from "./brazilianHolidays";

/**
 * Add N calendar days, but if result lands on weekend/holiday, advance to next working day.
 */
export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return skipToWorkingDay(result);
}

/**
 * Add N business days (Mon–Fri, excluding Brazilian holidays) to a date.
 */
export function addBusinessDays(date: Date, days: number): Date {
  const holidays = getHolidaySet(date.getFullYear());
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isNonWorkingDay(result, holidays)) added++;
  }
  return result;
}

/**
 * Advance a date to the next working day if it falls on a weekend or holiday.
 */
export function skipToWorkingDay(date: Date): Date {
  const holidays = getHolidaySet(date.getFullYear());
  const result = new Date(date);
  while (isNonWorkingDay(result, holidays)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * Format a Date as YYYY-MM-DD for <input type="date">.
 */
export function toInputDate(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format a Date as DD/MM/YYYY for display.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
