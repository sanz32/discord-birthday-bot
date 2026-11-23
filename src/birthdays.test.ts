import { describe, expect, it } from "vitest";
import { birthdaysOn, type Birthday } from "./birthdays";
import { birthdayListMessages, emojiLookup, greetingMessage, MESSAGE_LIMIT } from "./messages";

const list: Birthday[] = [
  { userId: "1", day: 10, month: 11 },
  { userId: "2", day: 12, month: 11 },
  { userId: "3", day: 22, month: 11 },
  { userId: "4", day: 29, month: 2 },
  { userId: "5", day: 28, month: 2 },
  { userId: "6", day: 10, month: 11 },
];

const on = (year: number, month: number, day: number) =>
  birthdaysOn(list, { year, month, day, hour: 0 }).map((b) => b.userId);

describe("birthdaysOn", () => {
  it("devuelve todos los que cumplen ese día", () => {
    expect(on(2026, 11, 10)).toEqual(["1", "6"]);
    expect(on(2026, 11, 11)).toEqual([]);
  });

  it("el 29 de febrero se saluda el 28 en años no bisiestos", () => {
    expect(on(2027, 2, 28)).toEqual(["4", "5"]);
    expect(on(2026, 2, 28)).toEqual(["4", "5"]);
  });

  it("en año bisiesto, cada uno en su día", () => {
    expect(on(2028, 2, 28)).toEqual(["5"]);
    expect(on(2028, 2, 29)).toEqual(["4"]);
  });
});

describe("mensajes", () => {
  const emojis = emojiLookup([
    { id: "111", name: "party" },
    { id: "222", name: "confetti", animated: true },
  ]);

  it("el saludo con los emojis del servidor", () => {
    expect(greetingMessage(["1"], emojis)).toBe(
      [
        "# ¡Feliz cumpleaños, <@1>! 🎂",
        "## De parte de todos, te deseamos un excelente día <:party:111>",
        "### 🎊 ¡Que cumplas muchos años más <a:confetti:222>! 🎊",
      ].join("\n"),
    );
  });

  it("varios cumpleañeros el mismo día van en plural", () => {
    const msg = greetingMessage(["1", "2", "3"], emojis);
    expect(msg).toContain("# ¡Feliz cumpleaños, <@1>, <@2> y <@3>! 🎂");
    expect(msg).toContain("De parte de todos, les deseamos");
    expect(msg).toContain("¡Que cumplan muchos años más");
  });

  it("si un emoji no existe en el servidor se omite sin dejar huecos", () => {
    const msg = greetingMessage(["1"], emojiLookup([]));
    expect(msg).toContain("## De parte de todos, te deseamos un excelente día\n");
    expect(msg).toContain("### 🎊 ¡Que cumplas muchos años más! 🎊");
    expect(msg).not.toContain(":party:");
  });

  it("la lista de un mes va ordenada por día", () => {
    const [msg] = birthdayListMessages(list, 11);
    expect(msg).toBe(["**NOVIEMBRE**", "• 10 — <@1>", "• 10 — <@6>", "• 12 — <@2>", "• 22 — <@3>"].join("\n"));
    expect(birthdayListMessages(list, 5)[0]).toContain("Nadie cumple");
  });

  it("la lista completa agrupa por mes en orden de calendario y salta los meses vacíos", () => {
    const msgs = birthdayListMessages(list);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toBe(
      ["**FEBRERO**", "• 28 — <@5>", "• 29 — <@4>", "", "**NOVIEMBRE**", "• 10 — <@1>", "• 10 — <@6>", "• 12 — <@2>", "• 22 — <@3>"].join("\n"),
    );
    expect(birthdayListMessages([])[0]).toContain("Todavía no hay");
  });

  it("una lista grande se reparte en varios mensajes sin perder a nadie", () => {
    const grande: Birthday[] = Array.from({ length: 300 }, (_, i) => ({
      userId: String(100000000000000000n + BigInt(i)),
      day: (i % 28) + 1,
      month: (i % 12) + 1,
    }));
    const msgs = birthdayListMessages(grande);
    expect(msgs.length).toBeGreaterThan(1);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    const todo = msgs.join("\n");
    for (const b of grande) expect(todo).toContain(`<@${b.userId}>`);
    expect(todo.match(/\*\*[A-Z]+\*\*/g)).toHaveLength(12);
  });

  it("un mes que solo no entra en un mensaje se parte por líneas", () => {
    const enero: Birthday[] = Array.from({ length: 120 }, (_, i) => ({ userId: String(200000000000000000n + BigInt(i)), day: (i % 31) + 1, month: 1 }));
    const msgs = birthdayListMessages(enero, 1);
    expect(msgs.length).toBeGreaterThan(1);
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    expect(msgs.join("\n").match(/<@\d+>/g)).toHaveLength(120);
  });
});
