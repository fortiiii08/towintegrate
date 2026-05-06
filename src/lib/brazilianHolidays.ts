/**
 * Brazilian national holidays utility.
 * Returns Date objects for all national holidays in a given year.
 * Includes fixed holidays and variable ones (Carnaval, Sexta Santa, Corpus Christi).
 */

/** Meeus/Jones/Butcher Easter algorithm */
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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getBrazilianHolidays(year: number): Date[] {
  const easter = easterDate(year);

  const fixed = [
    new Date(year, 0, 1),   // Confraternização Universal
    new Date(year, 3, 21),  // Tiradentes
    new Date(year, 4, 1),   // Dia do Trabalho
    new Date(year, 8, 7),   // Independência do Brasil
    new Date(year, 9, 12),  // Nossa Sra. Aparecida
    new Date(year, 10, 2),  // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 10, 20), // Consciência Negra
    new Date(year, 11, 25), // Natal
  ];

  const variable = [
    addDays(easter, -48), // Segunda de Carnaval
    addDays(easter, -47), // Terça de Carnaval
    addDays(easter, -2),  // Sexta-feira Santa
    easter,               // Páscoa
    addDays(easter, 60),  // Corpus Christi
  ];

  return [...fixed, ...variable];
}

/** Get a Set of "YYYY-MM-DD" strings for fast lookup */
export function getHolidaySet(year: number): Set<string> {
  const current = getBrazilianHolidays(year).map(ymd);
  // Also pre-load adjacent years in case the calendar spans year boundary
  const prev = getBrazilianHolidays(year - 1).map(ymd);
  const next = getBrazilianHolidays(year + 1).map(ymd);
  return new Set([...prev, ...current, ...next]);
}

/** Returns true if the date is a weekend or Brazilian holiday */
export function isNonWorkingDay(date: Date, holidays: Set<string>): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  return holidays.has(ymd(date));
}

/** Modifiers for react-day-picker: disables weekends and holidays */
export function buildDisabledMatcher(fromYear = new Date().getFullYear()) {
  const holidays = getHolidaySet(fromYear);
  return (date: Date) => isNonWorkingDay(date, holidays);
}
