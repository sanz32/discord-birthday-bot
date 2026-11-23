import { formatBirthday } from "./birthdays";
import type { GreetFn } from "./daily";
import { birthdayListMessages } from "./messages";
import type { Store } from "./store";
import { isValidBirthday } from "./time";

interface CommandOption {
  name: string;
  type: number;
  value?: string | number;
  options?: CommandOption[];
}

export interface Interaction {
  type: number;
  application_id: string;
  token: string;
  guild_id?: string;
  member?: { user: { id: string }; permissions: string };
  data?: { name: string; options?: CommandOption[] };
}

export interface Reply {
  content: string;
  ephemeral: boolean;
  followUps?: string[];
}

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;

function isAdmin(permissions: string | undefined): boolean {
  if (!permissions) return false;
  const p = BigInt(permissions);
  return (p & ADMINISTRATOR) !== 0n || (p & MANAGE_GUILD) !== 0n;
}

const private_ = (content: string): Reply => ({ content, ephemeral: true });

export async function handleCommand(
  interaction: Interaction,
  store: Store,
  greet: GreetFn,
): Promise<Reply> {
  const guildId = interaction.guild_id;
  const member = interaction.member;
  const sub = interaction.data?.options?.[0];
  if (!guildId || !member || !sub) return private_("Este comando solo funciona dentro de un servidor.");

  const opt = (name: string) => sub.options?.find((o) => o.name === name)?.value;
  const userId = member.user.id;
  const command = interaction.data!.name;

  if (command === "cumple") {
    switch (sub.name) {
      case "registrar": {
        const day = Number(opt("dia"));
        const month = Number(opt("mes"));
        if (!isValidBirthday(day, month)) return private_("Esa fecha no existe. Revisa el día y el mes.");
        await store.setBirthday(guildId, { userId, day, month });
        return private_(`Listo, tu cumpleaños quedó registrado el **${formatBirthday(day, month)}** 🎂`);
      }
      case "borrar": {
        const deleted = await store.deleteBirthday(guildId, userId);
        return private_(deleted ? "Tu cumpleaños se borró." : "No tenías un cumpleaños registrado.");
      }
      case "lista": {
        const mes = opt("mes");
        const [first, ...rest] = birthdayListMessages(await store.listBirthdays(guildId), mes === undefined ? undefined : Number(mes));
        return { ...private_(first), followUps: rest };
      }
    }
  }

  if (command === "cumple-admin") {
    if (!isAdmin(member.permissions)) return private_("Necesitas el permiso **Gestionar servidor** para esto.");
    switch (sub.name) {
      case "agregar": {
        const target = String(opt("usuario"));
        const day = Number(opt("dia"));
        const month = Number(opt("mes"));
        if (!isValidBirthday(day, month)) return private_("Esa fecha no existe. Revisa el día y el mes.");
        await store.setBirthday(guildId, { userId: target, day, month });
        return private_(`Registrado: <@${target}> el **${formatBirthday(day, month)}**.`);
      }
      case "quitar": {
        const target = String(opt("usuario"));
        const deleted = await store.deleteBirthday(guildId, target);
        return private_(deleted ? `Se borró el cumpleaños de <@${target}>.` : `<@${target}> no tenía cumpleaños registrado.`);
      }
      case "canal": {
        const channelId = String(opt("canal"));
        await store.setChannel(guildId, channelId);
        return private_(`Los saludos se van a publicar en <#${channelId}>. Usa \`/cumple-admin probar\` para comprobar que el bot puede escribir ahí.`);
      }
      case "probar": {
        const channelId = await store.getChannel(guildId);
        if (!channelId) return private_("Primero elige el canal con `/cumple-admin canal`.");
        try {
          await greet(guildId, channelId, [userId], { test: true });
        } catch {
          return private_(`No pude escribir en <#${channelId}>. Revisa que el bot pueda ver el canal y enviar mensajes ahí.`);
        }
        return private_(`Mensaje de prueba enviado a <#${channelId}>.`);
      }
    }
  }

  return private_("Comando desconocido.");
}
