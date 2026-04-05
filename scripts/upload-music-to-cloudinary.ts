import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MUSIC_FOLDER = "grace-through-faith/music";

const FILES = [
  {
    path: "attached_assets/music_for_videos-wedding-love-story-110055_1774570896015.mp3",
    name: "wedding-love-story",
  },
  {
    path: "attached_assets/tunetank-sentimental-emotional-piano-amp-strings-347305_1774570901160.mp3",
    name: "sentimental-emotional-piano-strings",
  },
  {
    path: "attached_assets/the_mountain-cinematic-documentaries-background-136079_1774570905412.mp3",
    name: "cinematic-documentaries-background",
  },
  {
    path: "attached_assets/good_b_music-cinematic-ambient-emotional-main-7230_1774570910125.mp3",
    name: "cinematic-ambient-emotional",
  },
  {
    path: "attached_assets/nastelbom-cinematic-485889_1774570920979.mp3",
    name: "nastelbom-cinematic",
  },
];

async function uploadAll() {
  console.log(`Uploading ${FILES.length} music tracks to Cloudinary...`);
  console.log(`Folder: ${MUSIC_FOLDER}\n`);

  for (const file of FILES) {
    const filePath = path.resolve(process.cwd(), file.path);
    if (!fs.existsSync(filePath)) {
      console.error(`SKIP: File not found: ${filePath}`);
      continue;
    }

    const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(0);
    console.log(`Uploading: ${file.name} (${sizeKB} KB)...`);

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "video",
        folder: MUSIC_FOLDER,
        public_id: file.name,
        overwrite: true,
      });
      console.log(`  OK: ${result.secure_url}`);
      console.log(`  Duration: ${result.duration}s | Format: ${result.format}\n`);
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}\n`);
    }
  }

  console.log("Done.");
}

uploadAll().catch((err) => {
  console.error("Upload script failed:", err);
  process.exit(1);
});
