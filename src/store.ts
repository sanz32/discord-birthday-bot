import type { Birthday } from "./birthdays";

export interface Store {
  setBirthday(guildId: string, b: Birthday): Promise<void>;
  deleteBirthday(guildId: string, userId: string): Promise<boolean>;
  listBirthdays(guildId: string): Promise<Birthday[]>;
  getChannel(guildId: string): Promise<string | null>;
  setChannel(guildId: string, channelId: string): Promise<void>;
  listConfiguredGuilds(): Promise<{ guildId: string; channelId: string }[]>;
  claimDay(guildId: string, dayKey: string): Promise<boolean>;
  releaseDay(guildId: string, dayKey: string): Promise<void>;
}

export function d1Store(db: D1Database): Store {
  return {
    async setBirthday(guildId, b) {
      await db
        .prepare(
          `insert into birthdays (guild_id, user_id, day, month) values (?, ?, ?, ?)
           on conflict (guild_id, user_id) do update set day = excluded.day, month = excluded.month`,
        )
        .bind(guildId, b.userId, b.day, b.month)
        .run();
    },
    async deleteBirthday(guildId, userId) {
      const r = await db.prepare("delete from birthdays where guild_id = ? and user_id = ?").bind(guildId, userId).run();
      return r.meta.changes > 0;
    },
    async listBirthdays(guildId) {
      const r = await db
        .prepare("select user_id, day, month from birthdays where guild_id = ?")
        .bind(guildId)
        .all<{ user_id: string; day: number; month: number }>();
      return r.results.map((row) => ({ userId: row.user_id, day: row.day, month: row.month }));
    },
    async getChannel(guildId) {
      const row = await db.prepare("select channel_id from settings where guild_id = ?").bind(guildId).first<{ channel_id: string }>();
      return row?.channel_id ?? null;
    },
    async setChannel(guildId, channelId) {
      await db
        .prepare(
          `insert into settings (guild_id, channel_id) values (?, ?)
           on conflict (guild_id) do update set channel_id = excluded.channel_id`,
        )
        .bind(guildId, channelId)
        .run();
    },
    async listConfiguredGuilds() {
      const r = await db.prepare("select guild_id, channel_id from settings").all<{ guild_id: string; channel_id: string }>();
      return r.results.map((row) => ({ guildId: row.guild_id, channelId: row.channel_id }));
    },
    async claimDay(guildId, dayKey) {
      const r = await db.prepare("insert or ignore into greeted (guild_id, day_key) values (?, ?)").bind(guildId, dayKey).run();
      return r.meta.changes > 0;
    },
    async releaseDay(guildId, dayKey) {
      await db.prepare("delete from greeted where guild_id = ? and day_key = ?").bind(guildId, dayKey).run();
    },
  };
}

export function memoryStore(): Store {
  const birthdays = new Map<string, Map<string, Birthday>>();
  const channels = new Map<string, string>();
  const greeted = new Set<string>();
  const guild = (id: string) => {
    if (!birthdays.has(id)) birthdays.set(id, new Map());
    return birthdays.get(id)!;
  };
  return {
    async setBirthday(guildId, b) { guild(guildId).set(b.userId, { ...b }); },
    async deleteBirthday(guildId, userId) { return guild(guildId).delete(userId); },
    async listBirthdays(guildId) { return [...guild(guildId).values()]; },
    async getChannel(guildId) { return channels.get(guildId) ?? null; },
    async setChannel(guildId, channelId) { channels.set(guildId, channelId); },
    async listConfiguredGuilds() { return [...channels].map(([guildId, channelId]) => ({ guildId, channelId })); },
    async claimDay(guildId, dayKey) {
      const k = `${guildId}|${dayKey}`;
      if (greeted.has(k)) return false;
      greeted.add(k);
      return true;
    },
    async releaseDay(guildId, dayKey) { greeted.delete(`${guildId}|${dayKey}`); },
  };
}
