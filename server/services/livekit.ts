import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

function isConfigured(): boolean {
  return !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL);
}

let _roomService: RoomServiceClient | null = null;

function getRoomService(): RoomServiceClient {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    throw new Error(
      "LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in your environment."
    );
  }
  if (!_roomService) {
    _roomService = new RoomServiceClient(
      LIVEKIT_URL.replace("wss://", "https://"),
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );
  }
  return _roomService;
}

export function getLiveKitUrl(): string {
  if (!LIVEKIT_URL) {
    throw new Error("LIVEKIT_URL is not configured.");
  }
  return LIVEKIT_URL;
}

export async function createLiveKitRoom(roomName: string): Promise<void> {
  try {
    await getRoomService().createRoom({
      name: roomName,
      emptyTimeout: 60 * 30,
      maxParticipants: 50,
    });
  } catch (err: any) {
    if (err?.message?.includes("already exists")) return;
    throw err;
  }
}

export async function deleteLiveKitRoom(roomName: string): Promise<void> {
  try {
    await getRoomService().deleteRoom(roomName);
  } catch (err) {
    console.error("Failed to delete LiveKit room:", err);
  }
}

export async function generateToken(
  roomName: string,
  participantName: string,
  isHost: boolean = false
): Promise<string> {
  const identity = `${participantName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now().toString(36)}`;

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    throw new Error("LiveKit credentials are not configured.");
  }
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: participantName,
    ttl: "6h",
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isHost,
  });

  return await token.toJwt();
}

export async function getParticipantCount(roomName: string): Promise<number> {
  try {
    const participants = await getRoomService().listParticipants(roomName);
    return participants.length;
  } catch {
    return 0;
  }
}
