import { Router, type Request, type Response } from "express";
import {
  getAllCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  toggleCharacterActive,
  uploadCharacterImage,
} from "../services/characterService";
import { requireAdmin } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const upload = multer({
  dest: "/tmp/character-uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, JPEG, and WebP images are allowed"));
    }
  },
});

router.get("/api/characters", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const chars = await getAllCharacters();
    res.json({ characters: chars });
  } catch (err) {
    console.error("[characters] List error:", err);
    res.status(500).json({ error: "Failed to list characters" });
  }
});

router.post("/api/characters", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, characterType, gender, description, cloudinaryUrl, thumbnailUrl, voiceId, aliases } = req.body;

    if (!name || !slug || !characterType) {
      return res.status(400).json({ error: "name, slug, and characterType are required" });
    }

    const validTypes = ["biblical", "narrator", "symbolic", "other"];
    if (!validTypes.includes(characterType)) {
      return res.status(400).json({ error: `characterType must be one of: ${validTypes.join(", ")}` });
    }

    if (aliases && (!Array.isArray(aliases) || !aliases.every((a: unknown) => typeof a === "string"))) {
      return res.status(400).json({ error: "aliases must be an array of strings" });
    }

    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(slug)) {
      return res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens" });
    }

    const char = await createCharacter({
      name,
      slug,
      characterType,
      gender,
      description,
      cloudinaryUrl,
      thumbnailUrl,
      voiceId,
      aliases: aliases || [],
    });

    res.status(201).json({ character: char });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "A character with this slug already exists" });
    }
    console.error("[characters] Create error:", err);
    res.status(500).json({ error: "Failed to create character" });
  }
});

router.put("/api/characters/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, characterType, gender, description, cloudinaryUrl, thumbnailUrl, voiceId, aliases } = req.body;

    if (aliases !== undefined && (!Array.isArray(aliases) || !aliases.every((a: unknown) => typeof a === "string"))) {
      return res.status(400).json({ error: "aliases must be an array of strings" });
    }

    if (slug !== undefined) {
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugPattern.test(slug)) {
        return res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens" });
      }
    }

    const char = await updateCharacter(id, {
      name,
      slug,
      characterType,
      gender,
      description,
      cloudinaryUrl,
      thumbnailUrl,
      voiceId,
      aliases,
    });

    if (!char) {
      return res.status(404).json({ error: "Character not found" });
    }

    res.json({ character: char });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "A character with this slug already exists" });
    }
    console.error("[characters] Update error:", err);
    res.status(500).json({ error: "Failed to update character" });
  }
});

router.post(
  "/api/characters/:id/upload-image",
  requireAdmin,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const char = await getCharacterById(id);
      if (!char) {
        return res.status(404).json({ error: "Character not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { url, thumbnailUrl } = await uploadCharacterImage(req.file.path, char.slug);

      const updated = await updateCharacter(id, {
        cloudinaryUrl: url,
        thumbnailUrl,
      });

      if (req.file.path) {
        fs.unlink(req.file.path, () => {});
      }

      res.json({ character: updated });
    } catch (err) {
      console.error("[characters] Upload error:", err);
      res.status(500).json({ error: "Failed to upload character image" });
    }
  }
);

router.patch("/api/characters/:id/toggle-active", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const char = await toggleCharacterActive(id);

    if (!char) {
      return res.status(404).json({ error: "Character not found" });
    }

    res.json({ character: char });
  } catch (err) {
    console.error("[characters] Toggle active error:", err);
    res.status(500).json({ error: "Failed to toggle character active status" });
  }
});

export default router;
