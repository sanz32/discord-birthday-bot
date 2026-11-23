import { birthdaysOn } from "./birthdays";
import type { Store } from "./store";
import { dayKey, isGreetingHour, localDate } from "./time";

export type GreetFn = (guildId: string, channelId: string, userIds: string[], opts?: { test?: boolean }) => Promise<void>;

export async function runDailyGreeting(store: Store, greet: GreetFn, now: Date, timeZone: string): Promise<string[]> {
  const date = localDate(now, timeZone);
  if (!isGreetingHour(date)) return [];

  const key = dayKey(date);
  const log: string[] = [];
  const errors: unknown[] = [];

  for (const { guildId, channelId } of await store.listConfiguredGuilds()) {
    const today = birthdaysOn(await store.listBirthdays(guildId), date);
    if (today.length === 0) continue;

    if (!(await store.claimDay(guildId, key))) continue;
    const ids = today.map((b) => b.userId);
    try {
      await greet(guildId, channelId, ids);
      log.push(`${guildId}: saludados ${ids.length}`);
    } catch (err) {
      await store.releaseDay(guildId, key);
      errors.push(err);
    }
  }

  if (errors.length > 0) throw new AggregateError(errors, "Falló el saludo en algún servidor");
  return log;
}
