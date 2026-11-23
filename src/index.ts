import { runDailyGreeting, type GreetFn } from "./daily";
import { fetchGuildEmojis, sendChannelMessage, sendFollowUp, type Attachment } from "./discord";
import { handleCommand, type Interaction } from "./interactions";
import { emojiLookup, greetingMessage, type GuildEmoji } from "./messages";
import { d1Store } from "./store";
import { verifyDiscordRequest } from "./verify";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  TIME_ZONE: string;
}

const PING = 1;
const APPLICATION_COMMAND = 2;
const PONG = 1;
const CHANNEL_MESSAGE_WITH_SOURCE = 4;
const EPHEMERAL = 1 << 6;

const IMAGE_PATH = "/cumple.png";

async function loadImage(env: Env): Promise<Attachment | undefined> {
  const res = await env.ASSETS.fetch(new Request(`https://assets.local${IMAGE_PATH}`));
  if (!res.ok) return undefined;
  return { filename: "cumple.png", contentType: "image/png", data: await res.arrayBuffer() };
}

function greeterFor(env: Env): GreetFn {
  return async (guildId, channelId, userIds, opts) => {
    const [emojis, image] = await Promise.all([
      fetchGuildEmojis(env.DISCORD_TOKEN, guildId).catch((err): GuildEmoji[] => {
        console.error(err);
        return [];
      }),
      loadImage(env).catch((err) => {
        console.error(err);
        return undefined;
      }),
    ]);
    let content = greetingMessage(userIds, emojiLookup(emojis));
    if (opts?.test) content = `-# mensaje de prueba\n${content}`;
    await sendChannelMessage(env.DISCORD_TOKEN, channelId, content, userIds, image);
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") return new Response("cumple-bot", { status: 200 });

    const body = await request.text();
    const ok = await verifyDiscordRequest(
      env.DISCORD_PUBLIC_KEY,
      request.headers.get("X-Signature-Ed25519"),
      request.headers.get("X-Signature-Timestamp"),
      body,
    );
    if (!ok) return new Response("firma inválida", { status: 401 });

    const interaction = JSON.parse(body) as Interaction;
    if (interaction.type === PING) return Response.json({ type: PONG });
    if (interaction.type !== APPLICATION_COMMAND) return new Response("tipo no soportado", { status: 400 });

    try {
      const reply = await handleCommand(interaction, d1Store(env.DB), greeterFor(env));
      if (reply.followUps?.length) {
        ctx.waitUntil(
          (async () => {
            await new Promise((r) => setTimeout(r, 1500));
            for (const content of reply.followUps!) {
              await sendFollowUp(interaction.application_id, interaction.token, content, reply.ephemeral);
            }
          })().catch((err) => console.error(err)),
        );
      }
      return Response.json({
        type: CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: reply.content, flags: reply.ephemeral ? EPHEMERAL : 0, allowed_mentions: { parse: [] } },
      });
    } catch (err) {
      console.error(err);
      return Response.json({
        type: CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Algo falló de mi lado. Prueba de nuevo en un rato.", flags: EPHEMERAL },
      });
    }
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const log = await runDailyGreeting(d1Store(env.DB), greeterFor(env), new Date(controller.scheduledTime), env.TIME_ZONE);
    for (const line of log) console.log(line);
  },
} satisfies ExportedHandler<Env>;
