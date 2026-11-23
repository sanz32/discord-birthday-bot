import { MONTH_NAMES, type Birthday } from "./birthdays";

function joinEs(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export type EmojiLookup = (name: string) => string;

export interface GuildEmoji {
  id: string;
  name: string;
  animated?: boolean;
}

export function emojiLookup(emojis: GuildEmoji[]): EmojiLookup {
  return (name) => {
    const e = emojis.find((x) => x.name === name);
    return e ? `<${e.animated ? "a" : ""}:${e.name}:${e.id}>` : "";
  };
}

const line = (...parts: string[]) => parts.filter(Boolean).join(" ");

export function greetingMessage(userIds: string[], emoji: EmojiLookup): string {
  const mentions = joinEs(userIds.map((id) => `<@${id}>`));
  const plural = userIds.length > 1;
  return [
    line(`# ¡Feliz cumpleaños, ${mentions}!`, "🎂"),
    line(`## De parte de todos, ${plural ? "les" : "te"} deseamos un excelente día`, emoji("party")),
    line(`### 🎊 ¡Que ${plural ? "cumplan" : "cumplas"} muchos años más`, emoji("confetti")) + "! 🎊",
  ].join("\n");
}

export const MESSAGE_LIMIT = 2000;

function monthSection(list: Birthday[], month: number): string[] {
  const inMonth = list.filter((b) => b.month === month).sort((a, b) => a.day - b.day);
  return [`**${MONTH_NAMES[month - 1].toUpperCase()}**`, ...inMonth.map((b) => `• ${b.day} — <@${b.userId}>`)];
}

function pack(sections: string[][], limit: number): string[] {
  const chunks: string[] = [];
  let current = "";
  const push = (text: string) => {
    if (current && current.length + 2 + text.length > limit) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${text}` : text;
  };
  for (const lines of sections) {
    const section = lines.join("\n");
    if (section.length <= limit) {
      push(section);
      continue;
    }
    let part = "";
    for (const line of lines) {
      if (part && part.length + 1 + line.length > limit) {
        push(part);
        part = "";
      }
      part = part ? `${part}\n${line}` : line;
    }
    if (part) push(part);
  }
  if (current) chunks.push(current);
  return chunks;
}

export function birthdayListMessages(list: Birthday[], month?: number, limit = MESSAGE_LIMIT): string[] {
  if (month !== undefined) {
    if (!list.some((b) => b.month === month)) {
      return [`**${MONTH_NAMES[month - 1].toUpperCase()}**\nNadie cumple años este mes.`];
    }
    return pack([monthSection(list, month)], limit);
  }
  const months = [...new Set(list.map((b) => b.month))].sort((a, b) => a - b);
  if (months.length === 0) return ["Todavía no hay cumpleaños registrados. Usa `/cumple registrar` para anotar el tuyo."];
  return pack(months.map((m) => monthSection(list, m)), limit);
}
