import { getApiUrl } from "@/lib/query-client";
import { churchMapEmbedUrl } from "@/lib/join-api-path";

export interface ChurchMapMarker {
  id: string;
  name: string;
  lat: string;
  lng: string;
}

export function isPlottableChurch(church: ChurchMapMarker): boolean {
  const lat = parseFloat(church.lat);
  const lng = parseFloat(church.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function buildChurchMapEmbedUrl(opts: {
  churches: ChurchMapMarker[];
  userLat?: number;
  userLng?: number;
  selectedChurchId?: string | null;
  zoom?: number;
}): string {
  const churches = opts.churches.filter(isPlottableChurch);
  const centerLat =
    opts.userLat ?? (churches.length > 0 ? parseFloat(churches[0].lat) : 39.8283);
  const centerLng =
    opts.userLng ?? (churches.length > 0 ? parseFloat(churches[0].lng) : -98.5795);
  const zoom = opts.zoom ?? (churches.length > 1 ? 4 : 14);

  const params = new URLSearchParams();
  params.set(
    "markers",
    JSON.stringify(
      churches.map((c) => ({
        id: c.id,
        name: c.name,
        lat: parseFloat(c.lat),
        lng: parseFloat(c.lng),
        selected: c.id === opts.selectedChurchId,
      })),
    ),
  );
  params.set("centerLat", centerLat.toString());
  params.set("centerLng", centerLng.toString());
  params.set("zoom", zoom.toString());
  if (opts.userLat != null) params.set("userLat", opts.userLat.toString());
  if (opts.userLng != null) params.set("userLng", opts.userLng.toString());

  return churchMapEmbedUrl(getApiUrl(), params);
}
