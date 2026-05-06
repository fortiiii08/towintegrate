/**
 * Brazilian national + São Paulo state holidays utility.
 * Used to disable weekends + holidays in recording schedule calendars.
 */

import { addDays, isSaturday, isSunday } from "date-fns";

// ── Easter (anonymous Gregorian algorithm) ────────────────────────────────────
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ── Fixed-date national holidays (MM-DD) ─────────────────────────────────────
const FIXED_NATIONAL: [number, number][] = [
  [1, 1],   // Confraternização Universal
  [4, 21],  // Tiradentes
  [5, 1],   // Dia do Trabalho
  [9, 7],   // Independência do Brasil
  [10, 12], // Nossa Senhora Aparecida
  [11, 2],  // Finados
  [11, 15], // Proclamação da República
  [11, 20], // Consciência Negra (lei federal 14.759/2023)
  [12, 25], // Natal
];

// ── Fixed-date São Paulo state/city holidays (MM-DD) ─────────────────────────
const FIXED_SAO_PAULO: [number, number][] = [
  [1, 25],  // Aniversário da cidade de São Paulo
  [7, 9],   // Revolução Constitucionalista
];

// ── Build holiday set for a given year ───────────────────────────────────────
function buildHolidaySet(year: number): Set<string> {
  const set = new Set<string>();

  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Fixed national
  for (const [m, d] of FIXED_NATIONAL) {
    set.add(`${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  // Fixed SP
  for (const [m, d] of FIXED_SAO_PAULO) {
    set.add(`${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  // Variable (Easter-based)
  const easter = easterDate(year);
  set.add(key(addDays(easter, -2)));  // Sexta-feira Santa (Good Friday)
  set.add(key(addDays(easter, -48))); // Segunda-feira de Carnaval
  set.add(key(addDays(easter, -47))); // Terça-feira de Carnaval
  set.add(key(addDays(easter, 60)));  // Corpus Christi

  return set;
}

// Cache per year so we don't recalculate on every render
const _cache: Record<number, Set<string>> = {};
function getHolidaySet(year: number): Set<string> {
  if (!_cache[year]) _cache[year] = buildHolidaySet(year);
  return _cache[year];
}

// ── Public helpers ────────────────────────────────────────────────────────────

/** Returns true if the date falls on Saturday or Sunday. */
export function isWeekend(date: Date): boolean {
  return isSaturday(date) || isSunday(date);
}

/** Returns true if the date is a Brazilian national or SP state/city holiday. */
export function isHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const key = `${y}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return getHolidaySet(y).has(key);
}

/** Returns true if the date should be blocked (weekend OR holiday). */
export function isBlockedDay(date: Date): boolean {
  return isWeekend(date) || isHoliday(date);
}

/**
 * Advances a date forward until it lands on a non-blocked (working) day.
 * Safe to call on a date that is already a working day — returns it unchanged.
 */
export function nextWorkingDay(date: Date): Date {
  let d = new Date(date);
  while (isBlockedDay(d)) {
    d = addDays(d, 1);
  }
  return d;
}
