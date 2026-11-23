import { isLeapYear, type LocalDate } from "./time";

export interface Birthday {
  userId: string;
  day: number;
  month: number;
}

export function birthdaysOn(list: Birthday[], date: LocalDate): Birthday[] {
  const feb29Fallback = date.month === 2 && date.day === 28 && !isLeapYear(date.year);
  return list.filter(
    (b) =>
      (b.month === date.month && b.day === date.day) ||
      (feb29Fallback && b.month === 2 && b.day === 29),
  );
}

export const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function formatBirthday(day: number, month: number): string {
  return `${day} de ${MONTH_NAMES[month - 1]}`;
}
