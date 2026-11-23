import { COMMANDS } from "../src/command-definitions";

const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!appId || !token) {
  console.error("Faltan DISCORD_APPLICATION_ID o DISCORD_TOKEN en .dev.vars");
  process.exit(1);
}

const url = guildId
  ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${appId}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(COMMANDS),
});

if (!res.ok) {
  console.error(`Discord respondió ${res.status}:`, await res.text());
  process.exit(1);
}
console.log(`Comandos registrados (${guildId ? "en el servidor" : "globales"}): ${COMMANDS.map((c) => "/" + c.name).join(", ")}`);
