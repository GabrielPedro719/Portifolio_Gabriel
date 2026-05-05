export function normalizeRoomKey(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
}

export function createRoomKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = Array.from({ length: 2 }, () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(""),
  );

  return `CHESS-${segments.join("-")}`;
}

export function buildJitsiRoomUrl(params: {
  username: string;
  roomKey: string;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
}) {
  const encodedRoom = encodeURIComponent(`jitsi-chess-${normalizeRoomKey(params.roomKey).toLowerCase()}`);
  const encodedName = encodeURIComponent(params.username.trim());
  const audioMuted = params.microphoneEnabled ? "0" : "1";
  const videoMuted = params.cameraEnabled ? "0" : "1";

  return `https://meet.jit.si/${encodedRoom}#userInfo.displayName=%22${encodedName}%22&config.startWithAudioMuted=${audioMuted}&config.startWithVideoMuted=${videoMuted}`;
}

export function buildJitsiRoomLabel(roomKey: string) {
  return `meet.jit.si/jitsi-chess-${normalizeRoomKey(roomKey).toLowerCase()}`;
}
