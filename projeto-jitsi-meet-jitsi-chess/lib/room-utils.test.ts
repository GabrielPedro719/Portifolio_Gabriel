import { describe, expect, it } from "vitest";

import { buildJitsiRoomLabel, buildJitsiRoomUrl, createRoomKey, normalizeRoomKey } from "./room-utils";

describe("room-utils", () => {
  it("normaliza chaves de sala para formato compartilhável", () => {
    expect(normalizeRoomKey(" chess-ab12 34!? ")).toBe("CHESS-AB1234");
  });

  it("gera chaves curtas com prefixo do produto", () => {
    expect(createRoomKey()).toMatch(/^CHESS-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("monta o rótulo público da sala Jitsi", () => {
    expect(buildJitsiRoomLabel("Chess-ABCD-2345")).toBe("meet.jit.si/jitsi-chess-chess-abcd-2345");
  });

  it("monta a URL Jitsi com nome e estados de mídia", () => {
    const url = buildJitsiRoomUrl({
      username: "Ana Maria",
      roomKey: "Chess-ABCD-2345",
      microphoneEnabled: false,
      cameraEnabled: true,
    });

    expect(url).toContain("https://meet.jit.si/jitsi-chess-chess-abcd-2345");
    expect(url).toContain("userInfo.displayName=%22Ana%20Maria%22");
    expect(url).toContain("config.startWithAudioMuted=1");
    expect(url).toContain("config.startWithVideoMuted=0");
  });
});
