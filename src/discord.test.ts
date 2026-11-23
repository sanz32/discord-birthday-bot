import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChannelMessage } from "./discord";

afterEach(() => vi.unstubAllGlobals());

describe("sendChannelMessage", () => {
  it("con imagen manda multipart con el texto y el archivo adjunto", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const data = new Uint8Array([137, 80, 78, 71]).buffer;
    await sendChannelMessage("tok", "c1", "hola <@u1>", ["u1"], { filename: "cumple.png", contentType: "image/png", data });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://discord.com/api/v10/channels/c1/messages");
    const form = init.body as FormData;
    expect(JSON.parse(form.get("payload_json") as string)).toEqual({
      content: "hola <@u1>",
      allowed_mentions: { users: ["u1"] },
      attachments: [{ id: 0, filename: "cumple.png" }],
    });
    const file = form.get("files[0]") as File;
    expect(file.name).toBe("cumple.png");
    expect(file.size).toBe(4);
  });

  it("un error de Discord se propaga para que el cron reintente", async () => {
    vi.stubGlobal("fetch", async () => new Response("Missing Permissions", { status: 403 }));
    await expect(sendChannelMessage("tok", "c1", "x", [])).rejects.toThrow("403");
  });
});
