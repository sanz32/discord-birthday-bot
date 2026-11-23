import type { GuildEmoji } from "./messages";

const API = "https://discord.com/api/v10";

export interface Attachment {
  filename: string;
  data: ArrayBuffer;
  contentType: string;
}

export async function sendChannelMessage(
  token: string,
  channelId: string,
  content: string,
  mentionUserIds: string[],
  attachment?: Attachment,
) {
  const payload: Record<string, unknown> = { content, allowed_mentions: { users: mentionUserIds } };
  let body: BodyInit;
  const headers: Record<string, string> = { Authorization: `Bot ${token}` };

  if (attachment) {
    payload.attachments = [{ id: 0, filename: attachment.filename }];
    const form = new FormData();
    form.append("payload_json", JSON.stringify(payload));
    form.append("files[0]", new Blob([attachment.data], { type: attachment.contentType }), attachment.filename);
    body = form;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  }

  const res = await fetch(`${API}/channels/${channelId}/messages`, { method: "POST", headers, body });
  if (!res.ok) {
    throw new Error(`Discord respondió ${res.status} al publicar en ${channelId}: ${await res.text()}`);
  }
}

export async function sendFollowUp(applicationId: string, interactionToken: string, content: string, ephemeral: boolean) {
  const res = await fetch(`${API}/webhooks/${applicationId}/${interactionToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, flags: ephemeral ? 1 << 6 : 0, allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) throw new Error(`Discord respondió ${res.status} a un mensaje adicional: ${await res.text()}`);
}

export async function fetchGuildEmojis(token: string, guildId: string): Promise<GuildEmoji[]> {
  const res = await fetch(`${API}/guilds/${guildId}/emojis`, { headers: { Authorization: `Bot ${token}` } });
  if (!res.ok) throw new Error(`Discord respondió ${res.status} al pedir los emojis de ${guildId}`);
  return (await res.json()) as GuildEmoji[];
}
