import { describe, expect, it } from "vitest";
import { dayKey, isGreetingHour, isValidBirthday, localDate } from "./time";

const NY = "America/New_York";

describe("localDate / isGreetingHour", () => {
  it("invierno (EST, UTC-5): saluda a las 05:00 UTC, no a las 04:00", () => {
    expect(isGreetingHour(localDate(new Date("2026-11-10T05:00:00Z"), NY))).toBe(true);
    expect(isGreetingHour(localDate(new Date("2026-11-10T04:00:00Z"), NY))).toBe(false);
    expect(dayKey(localDate(new Date("2026-11-10T05:00:00Z"), NY))).toBe("2026-11-10");
  });

  it("verano (EDT, UTC-4): saluda a las 04:00 UTC, no a las 05:00", () => {
    expect(isGreetingHour(localDate(new Date("2026-07-15T04:00:00Z"), NY))).toBe(true);
    expect(isGreetingHour(localDate(new Date("2026-07-15T05:00:00Z"), NY))).toBe(false);
    expect(dayKey(localDate(new Date("2026-07-15T04:00:00Z"), NY))).toBe("2026-07-15");
  });

  function nthSunday(year: number, month: number, n: number): number {
    const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
    return 1 + ((7 - firstDow) % 7) + (n - 1) * 7;
  }
  function midnightUtcHour(year: number, month: number, day: number): number {
    const dstStart = Date.UTC(year, 2, nthSunday(year, 2, 2));
    const dstEnd = Date.UTC(year, 10, nthSunday(year, 10, 1));
    const t = Date.UTC(year, month, day);
    return t > dstStart && t <= dstEnd ? 4 : 5;
  }

  it("cada día saluda en el horario del cron que es la medianoche de Nueva York", () => {
    const start = Date.UTC(2026, 0, 1);
    const end = Date.UTC(2030, 0, 1);
    let days = 0;
    for (let t = start; t < end; t += 86_400_000) {
      const d = new Date(t);
      const [y, m, dd] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
      const greetingHours = [4, 5].filter((h) => isGreetingHour(localDate(new Date(Date.UTC(y, m, dd, h)), NY)));
      expect(greetingHours).toEqual([midnightUtcHour(y, m, dd)]);
      expect(dayKey(localDate(new Date(Date.UTC(y, m, dd, greetingHours[0])), NY))).toBe(d.toISOString().slice(0, 10));
      days++;
    }
    expect(days).toBe(1461);
  });

  it("los reintentos de :15 y :30 siguen siendo la hora 0 local", () => {
    expect(isGreetingHour(localDate(new Date("2026-11-10T05:30:00Z"), NY))).toBe(true);
    expect(isGreetingHour(localDate(new Date("2026-07-15T04:30:00Z"), NY))).toBe(true);
  });
});

describe("isValidBirthday", () => {
  it("acepta el 29 de febrero y rechaza fechas inexistentes", () => {
    expect(isValidBirthday(29, 2)).toBe(true);
    expect(isValidBirthday(30, 2)).toBe(false);
    expect(isValidBirthday(31, 4)).toBe(false);
    expect(isValidBirthday(31, 12)).toBe(true);
    expect(isValidBirthday(0, 1)).toBe(false);
    expect(isValidBirthday(1, 13)).toBe(false);
  });
});
