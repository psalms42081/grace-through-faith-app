BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."church_geocode_cache" (
  "query_key" text PRIMARY KEY NOT NULL,
  "lat" double precision NOT NULL,
  "lng" double precision NOT NULL,
  "place" text NOT NULL,
  "country" text NOT NULL,
  "expires_at" timestamptz NOT NULL
);
--> statement-breakpoint
COMMIT;
