import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const LIVEKIT_URL = process.env.LIVEKIT_URL!;

const httpUrl = LIVEKIT_URL.replace("wss://", "https://");

const roomService = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

export function getLiveKitUrl(): string {
  return LIVEKIT_URL;
}

export async function createLiveKitRoom(roomName: string): Promise<void> {
  try {
    await roomService.createRoom({
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
    await roomService.deleteRoom(roomName);
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
    const participants = await roomService.listParticipants(roomName);
    return participants.length;
  } catch {
    return 0;
  }
}
