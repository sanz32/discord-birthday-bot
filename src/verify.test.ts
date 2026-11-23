import { describe, expect, it } from "vitest";
import { verifyDiscordRequest } from "./verify";

const toHex = (buf: ArrayBuffer) => Buffer.from(buf).toString("hex");

async function keyPair() {
  const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const publicHex = toHex(await crypto.subtle.exportKey("raw", pair.publicKey) as ArrayBuffer);
  const sign = async (msg: string) => toHex(await crypto.subtle.sign("Ed25519", pair.privateKey, new TextEncoder().encode(msg)));
  return { publicHex, sign };
}

describe("verifyDiscordRequest", () => {
  it("acepta una firma válida y rechaza un cuerpo alterado", async () => {
    const { publicHex, sign } = await keyPair();
    const body = '{"type":1}';
    const sig = await sign("123" + body);
    expect(await verifyDiscordRequest(publicHex, sig, "123", body)).toBe(true);
    expect(await verifyDiscordRequest(publicHex, sig, "123", '{"type":2}')).toBe(false);
    expect(await verifyDiscordRequest(publicHex, sig, "124", body)).toBe(false);
  });

  it("rechaza pedidos sin firma o con basura", async () => {
    const { publicHex } = await keyPair();
    expect(await verifyDiscordRequest(publicHex, null, "1", "x")).toBe(false);
    expect(await verifyDiscordRequest(publicHex, "zz", "1", "x")).toBe(false);
  });
});
