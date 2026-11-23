import { describe, expect, it } from "vitest";
import { handleCommand, type Interaction } from "./interactions";
import { memoryStore } from "./store";

const MANAGE_GUILD = String(1 << 5);
const noGreet = async () => {};

const cmd = (name: string, sub: string, options: Record<string, string | number> = {}, permissions = "0"): Interaction => ({
  type: 2,
  application_id: "app",
  token: "tok",
  guild_id: "g1",
  member: { user: { id: "me" }, permissions },
  data: { name, options: [{ name: sub, type: 1, options: Object.entries(options).map(([n, value]) => ({ name: n, type: 4, value })) }] },
});

describe("handleCommand", () => {
  it("registrar, lista y borrar", async () => {
    const store = memoryStore();
    const r = await handleCommand(cmd("cumple", "registrar", { dia: 10, mes: 11 }), store, noGreet);
    expect(r.content).toContain("10 de noviembre");
    expect((await handleCommand(cmd("cumple", "lista"), store, noGreet)).content).toContain("<@me>");
    await handleCommand(cmd("cumple", "borrar"), store, noGreet);
    expect(await store.listBirthdays("g1")).toEqual([]);
  });

  it("lista sin mes muestra todos los meses; con mes, solo ese", async () => {
    const store = memoryStore();
    await store.setBirthday("g1", { userId: "a", day: 3, month: 1 });
    await store.setBirthday("g1", { userId: "b", day: 10, month: 11 });
    const todos = await handleCommand(cmd("cumple", "lista"), store, noGreet);
    expect(todos.content).toContain("**ENERO**");
    expect(todos.content).toContain("**NOVIEMBRE**");
    expect(todos.followUps).toEqual([]);
    const enero = await handleCommand(cmd("cumple", "lista", { mes: 1 }), store, noGreet);
    expect(enero.content).toContain("**ENERO**");
    expect(enero.content).not.toContain("NOVIEMBRE");
  });

  it("rechaza fechas que no existen", async () => {
    const store = memoryStore();
    const r = await handleCommand(cmd("cumple", "registrar", { dia: 31, mes: 4 }), store, noGreet);
    expect(r.content).toContain("no existe");
    expect(await store.listBirthdays("g1")).toEqual([]);
  });

  it("cumple-admin exige Gestionar servidor", async () => {
    const store = memoryStore();
    const denied = await handleCommand(cmd("cumple-admin", "agregar", { usuario: "u9", dia: 1, mes: 1 }), store, noGreet);
    expect(denied.content).toContain("Gestionar servidor");
    expect(await store.listBirthdays("g1")).toEqual([]);

    await handleCommand(cmd("cumple-admin", "agregar", { usuario: "u9", dia: 1, mes: 1 }, MANAGE_GUILD), store, noGreet);
    expect(await store.listBirthdays("g1")).toEqual([{ userId: "u9", day: 1, month: 1 }]);
  });
});
