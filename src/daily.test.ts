import { describe, expect, it } from "vitest";
import { runDailyGreeting, type GreetFn } from "./daily";
import { memoryStore } from "./store";

const NY = "America/New_York";

async function setup() {
  const store = memoryStore();
  await store.setChannel("g1", "c1");
  await store.setBirthday("g1", { userId: "u1", day: 10, month: 11 });
  const sent: { guildId: string; channelId: string; ids: string[] }[] = [];
  const greet: GreetFn = async (guildId, channelId, ids) => {
    sent.push({ guildId, channelId, ids });
  };
  return { store, sent, greet };
}

describe("runDailyGreeting", () => {
  it("saluda una sola vez aunque corran los dos horarios y los reintentos", async () => {
    const { store, sent, greet } = await setup();
    for (const t of ["04:00", "04:15", "04:30", "05:00", "05:15", "05:30"]) {
      await runDailyGreeting(store, greet, new Date(`2026-11-10T${t}:00Z`), NY);
    }
    expect(sent).toEqual([{ guildId: "g1", channelId: "c1", ids: ["u1"] }]);
  });

  it("no saluda fuera de la medianoche local", async () => {
    const { store, sent, greet } = await setup();
    await runDailyGreeting(store, greet, new Date("2026-11-10T04:00:00Z"), NY);
    expect(sent).toHaveLength(0);
  });

  it("si el envío falla, el reintento lo vuelve a intentar", async () => {
    const { store, sent, greet } = await setup();
    let fail = true;
    const flaky: GreetFn = async (...args) => {
      if (fail) throw new Error("Discord caído");
      await greet(...args);
    };
    await expect(runDailyGreeting(store, flaky, new Date("2026-11-10T05:00:00Z"), NY)).rejects.toThrow();
    fail = false;
    await runDailyGreeting(store, flaky, new Date("2026-11-10T05:15:00Z"), NY);
    expect(sent).toHaveLength(1);
  });

  it("un servidor que falla no deja sin saludo a los demás", async () => {
    const { store, sent, greet } = await setup();
    await store.setChannel("g0", "roto");
    await store.setBirthday("g0", { userId: "u0", day: 10, month: 11 });
    const partial: GreetFn = async (g, c, ids) => {
      if (c === "roto") throw new Error("sin permisos");
      await greet(g, c, ids);
    };
    await expect(runDailyGreeting(store, partial, new Date("2026-11-10T05:00:00Z"), NY)).rejects.toThrow();
    expect(sent.map((s) => s.channelId)).toEqual(["c1"]);
  });

  it("en verano saluda a las 04:00 UTC", async () => {
    const { store, sent, greet } = await setup();
    await store.setBirthday("g1", { userId: "u2", day: 15, month: 7 });
    await runDailyGreeting(store, greet, new Date("2026-07-15T04:00:00Z"), NY);
    expect(sent.map((s) => s.ids)).toEqual([["u2"]]);
  });
});
