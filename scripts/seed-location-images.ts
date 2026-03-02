import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, isNotNull } from "drizzle-orm";
import { locations } from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

function getStaticMapUrl(lat: string, lon: string, zoom: number = 12): string {
  const z = zoom;
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  const n = Math.pow(2, z);
  const x = Math.floor(((lonNum + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((latNum * Math.PI) / 180) + 1 / Math.cos((latNum * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

async function seed() {
  console.log("Updating location images to use map tile URLs...");

  const allLocations = await db
    .select()
    .from(locations)
    .where(isNotNull(locations.latitude));

  let updated = 0;

  for (const loc of allLocations) {
    if (!loc.latitude || !loc.longitude) continue;

    const mapUrl = getStaticMapUrl(loc.latitude, loc.longitude, 10);

    await db
      .update(locations)
      .set({ imageUrl: mapUrl })
      .where(eq(locations.id, loc.id));

    updated++;
    console.log(`  Updated: ${loc.name} (${loc.latitude}, ${loc.longitude})`);
  }

  console.log(`\nUpdated ${updated} location images with map tiles.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
