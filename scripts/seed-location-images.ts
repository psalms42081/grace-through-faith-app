import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { locations } from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const LOCATION_IMAGES: Record<string, string> = {
  "Jerusalem":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Jerusalem_from_the_Mount_of_Olives_by_Frederic_Edwin_Church%2C_1870.jpg/1280px-Jerusalem_from_the_Mount_of_Olives_by_Frederic_Edwin_Church%2C_1870.jpg",
  "Bethlehem":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/1882_Bethlehem_from_the_Latin_Convent.jpg/1280px-1882_Bethlehem_from_the_Latin_Convent.jpg",
  "Nazareth":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Nazareth%2C_Holy_Land%2C_1842.jpg/1280px-Nazareth%2C_Holy_Land%2C_1842.jpg",
  "Capernaum":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Ruins_of_the_Synagogue_at_Capernaum.jpg/1280px-Ruins_of_the_Synagogue_at_Capernaum.jpg",
  "Jericho":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Jericho_from_Tell_es-Sultan.jpg/1280px-Jericho_from_Tell_es-Sultan.jpg",
  "Babylon":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/The_Fall_of_Babylon%3B_Cyrus_the_Great_defeating_the_Chaldean_army._Wellcome_V0034440.jpg/1280px-The_Fall_of_Babylon%3B_Cyrus_the_Great_defeating_the_Chaldean_army._Wellcome_V0034440.jpg",
  "Egypt (Goshen)":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/1867_Edward_Poynter_-_Israel_in_Egypt.jpg/1280px-1867_Edward_Poynter_-_Israel_in_Egypt.jpg",
  "Mount Sinai":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/1839_-_David_Roberts_-_The_Monastery_of_St._Catherine_with_Mount_Horeb.jpg/1280px-1839_-_David_Roberts_-_The_Monastery_of_St._Catherine_with_Mount_Horeb.jpg",
  "Damascus":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Damascus_from_the_Anti-Lebanon_-_David_Roberts.jpg/1280px-Damascus_from_the_Anti-Lebanon_-_David_Roberts.jpg",
  "Antioch":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Antioch_on_the_Orontes_-_4th_century_-_765CY.jpg/1280px-Antioch_on_the_Orontes_-_4th_century_-_765CY.jpg",
  "Corinth":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Corinth_from_Acrocorinth_%28Akrokorinthos%29_c1900.jpg/1280px-Corinth_from_Acrocorinth_%28Akrokorinthos%29_c1900.jpg",
  "Ephesus":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Celsus_library_in_Ephesus.jpg/1280px-Celsus_library_in_Ephesus.jpg",
  "Rome":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Giovanni_Paolo_Panini_%E2%80%93_Ancient_Rome.jpg/1280px-Giovanni_Paolo_Panini_%E2%80%93_Ancient_Rome.jpg",
  "Sea of Galilee":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Christ_Walking_on_the_Sea_of_Galilee%2C_by_Aivazovsky.jpg/1280px-Christ_Walking_on_the_Sea_of_Galilee%2C_by_Aivazovsky.jpg",
  "Jordan River":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/The_Baptism_of_Christ_-_Piero_della_Francesca.jpg/800px-The_Baptism_of_Christ_-_Piero_della_Francesca.jpg",
  "Bethany":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/The_Raising_of_Lazarus_-_Duccio.jpg/800px-The_Raising_of_Lazarus_-_Duccio.jpg",
  "Samaria":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Angelika_Kauffmann_-_Christ_and_the_Samaritan_Woman_at_the_Well_-_WGA12101.jpg/800px-Angelika_Kauffmann_-_Christ_and_the_Samaritan_Woman_at_the_Well_-_WGA12101.jpg",
  "Nineveh":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Nineveh_-_Mashki_Gate_from_NW.jpg/1280px-Nineveh_-_Mashki_Gate_from_NW.jpg",
  "Ur":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Ziggurat_of_ur.jpg/1280px-Ziggurat_of_ur.jpg",
  "Hebron":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/1898_Hebron.jpg/1280px-1898_Hebron.jpg",
  "Megiddo":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/TellMegiddo.jpg/1280px-TellMegiddo.jpg",
  "Philippi":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Basilica_B_at_Philippi.jpg/1280px-Basilica_B_at_Philippi.jpg",
  "Thessalonica":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/The_Arch_of_Galerius_in_Thessaloniki_%2815th_century%29.jpg/1280px-The_Arch_of_Galerius_in_Thessaloniki_%2815th_century%29.jpg",
  "Patmos":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Patmos_%28Kloster%29.jpg/1280px-Patmos_%28Kloster%29.jpg",
  "Garden of Eden Region":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Lucas_Cranach_d._%C3%84._-_Das_Paradies_-_GG_3678_-_Kunsthistorisches_Museum.jpg/1280px-Lucas_Cranach_d._%C3%84._-_Das_Paradies_-_GG_3678_-_Kunsthistorisches_Museum.jpg",
  "Mount Ararat":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Aivazovsky_-_Descent_of_Noah_from_Ararat.jpg/1280px-Aivazovsky_-_Descent_of_Noah_from_Ararat.jpg",
  "Mount Carmel":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Mount_Carmel_as_seen_from_Muhraqa.jpg/1280px-Mount_Carmel_as_seen_from_Muhraqa.jpg",
  "Tarsus":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Tarsus_cleopatra_gate.jpg/1024px-Tarsus_cleopatra_gate.jpg",
};

async function seed() {
  console.log("Seeding location images...");

  let updated = 0;

  for (const [name, imageUrl] of Object.entries(LOCATION_IMAGES)) {
    const result = await db
      .update(locations)
      .set({ imageUrl })
      .where(eq(locations.name, name))
      .returning();

    if (result.length) {
      updated++;
      console.log(`  Updated image for: ${name}`);
    } else {
      console.warn(`  Location not found: ${name}`);
    }
  }

  console.log(`\nUpdated ${updated} location images.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
