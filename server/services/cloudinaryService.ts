import { v2 as cloudinary } from "cloudinary";

function ensureConfigured() {
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

export async function uploadImageFromFile(
  filePath: string,
  publicId: string
): Promise<string> {
  ensureConfigured();

  console.log(
    `[cloudinary] Uploading image to grace-through-faith/easter-assets/${publicId}...`
  );

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: "image",
    folder: "grace-through-faith/easter-assets",
    public_id: publicId,
    overwrite: true,
  });

  console.log(
    `[cloudinary] Image upload complete: ${result.secure_url.substring(0, 80)}...`
  );

  return result.secure_url;
}

export async function uploadVideoFromUrl(
  videoUrl: string,
  publicId: string
): Promise<string> {
  ensureConfigured();

  console.log(
    `[cloudinary] Uploading video to grace-through-faith/videos/${publicId}...`
  );

  const result = await cloudinary.uploader.upload(videoUrl, {
    resource_type: "video",
    folder: "grace-through-faith/videos",
    public_id: publicId,
    overwrite: true,
  });

  console.log(
    `[cloudinary] Upload complete: ${result.secure_url.substring(0, 80)}...`
  );

  return result.secure_url;
}
