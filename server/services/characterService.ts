import { db } from "../db";
import { characters, type Character } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

function ensureCloudinaryConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary credentials: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set"
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export async function getActiveCharacters(): Promise<Character[]> {
  return db
    .select()
    .from(characters)
    .where(eq(characters.isActive, true));
}

export async function getAllCharacters(): Promise<Character[]> {
  return db.select().from(characters);
}

export async function getCharacterById(id: string): Promise<Character | undefined> {
  const [row] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, id));
  return row;
}

export async function getCharacterBySlug(slug: string): Promise<Character | undefined> {
  const [row] = await db
    .select()
    .from(characters)
    .where(eq(characters.slug, slug));
  return row;
}

export async function createCharacter(data: {
  name: string;
  slug: string;
  characterType: string;
  gender?: string;
  description?: string;
  cloudinaryUrl?: string;
  thumbnailUrl?: string;
  voiceId?: string;
  aliases?: string[];
}): Promise<Character> {
  const [row] = await db
    .insert(characters)
    .values({
      name: data.name,
      slug: data.slug,
      characterType: data.characterType,
      gender: data.gender,
      description: data.description,
      cloudinaryUrl: data.cloudinaryUrl,
      thumbnailUrl: data.thumbnailUrl,
      voiceId: data.voiceId,
      aliases: data.aliases || [],
    })
    .returning();
  return row;
}

export async function updateCharacter(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    characterType: string;
    gender: string;
    description: string;
    cloudinaryUrl: string;
    thumbnailUrl: string;
    voiceId: string;
    aliases: string[];
    isActive: boolean;
  }>
): Promise<Character | undefined> {
  const [row] = await db
    .update(characters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(characters.id, id))
    .returning();
  return row;
}

export async function toggleCharacterActive(id: string): Promise<Character | undefined> {
  const existing = await getCharacterById(id);
  if (!existing) return undefined;

  const [row] = await db
    .update(characters)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(characters.id, id))
    .returning();
  return row;
}

export async function uploadCharacterImage(
  localFilePath: string,
  slug: string
): Promise<{ url: string; thumbnailUrl: string }> {
  ensureCloudinaryConfigured();

  const publicId = `grace-through-faith/characters/${slug}`;

  console.log(`[character-service] Uploading character image to ${publicId}...`);

  const result = await cloudinary.uploader.upload(localFilePath, {
    resource_type: "image",
    public_id: publicId,
    overwrite: true,
  });

  const thumbnailUrl = cloudinary.url(publicId, {
    width: 200,
    height: 200,
    crop: "fill",
    gravity: "face",
    format: "jpg",
    secure: true,
  });

  console.log(`[character-service] Upload complete: ${result.secure_url.substring(0, 80)}...`);

  return {
    url: result.secure_url,
    thumbnailUrl,
  };
}

export function matchCharactersToScene(
  activeCharacters: Character[],
  sceneVisual: string,
  sceneCharacter?: string
): string[] {
  const lowerVisual = sceneVisual.toLowerCase();
  const lowerCharacter = sceneCharacter?.toLowerCase() || "";
  const matchedUrls: string[] = [];

  for (const char of activeCharacters) {
    if (!char.cloudinaryUrl) continue;

    const aliases = (char.aliases as string[]) || [];
    const matched = aliases.some((alias) => {
      const lowerAlias = alias.toLowerCase();
      return lowerVisual.includes(lowerAlias) || lowerCharacter.includes(lowerAlias);
    });

    if (matched) {
      matchedUrls.push(char.cloudinaryUrl);
    }
  }

  return matchedUrls;
}
