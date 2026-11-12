import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { getSabbathSchoolQuarterTheme } from "@/lib/sabbath-school-quarter-theme";
import {
  SABBATH_SCHOOL_COVER_FRAME,
  sabbathSchoolCoverUrl,
  sabbathSchoolSplashUrl,
} from "@/lib/sabbath-school-artwork";
import {
  quarterBaseCode,
  quarterCodeForTrack,
  type SabbathSchoolTrackId,
} from "@/lib/sabbath-school-tracks";
import { SabbathSchoolArtwork } from "@/components/sabbath-school/SabbathSchoolArtwork";

/** Banner height. The picture lives here; the words live in the panel below. */
export const SABBATH_SCHOOL_BANNER_HEIGHT = 150;
/** Soft join from the picture into the solid quarterly colour. */
export const SABBATH_SCHOOL_BANNER_FADE = 24;

const warmed = new Set<string>();

/** Keep Adult and InVerse art in the image cache before the switch is tapped. */
export function warmSabbathSchoolImages(uris: Array<string | null | undefined>) {
  for (const uri of uris) {
    if (!uri || warmed.has(uri)) continue;
    warmed.add(uri);
    Image.prefetch(uri, "memory-disk").catch(() => {
      warmed.delete(uri);
    });
  }
}

function siblingArtwork(quarterCode: string | null | undefined, coverUrl?: string | null) {
  const splash = sabbathSchoolSplashUrl(quarterCode);
  const cover = sabbathSchoolCoverUrl(quarterCode, coverUrl);
  const base = quarterBaseCode(quarterCode ?? "");
  const uris = [splash, cover];
  if (base) {
    for (const track of ["adult", "inverse"] as SabbathSchoolTrackId[]) {
      const code = quarterCodeForTrack(base, track);
      uris.push(sabbathSchoolSplashUrl(code), sabbathSchoolCoverUrl(code, null));
    }
  }
  return { splash, cover, uris };
}

/**
 * Adult splash art is centred on the dove. InVerse splash art sits in the
 * upper half of a tall image, so a centred slice cuts the lighthouse off.
 */
function splashCrop(uri: string): "center" | "top" {
  return uri.includes("-cq/") ? "top" : "center";
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const red = parseInt(raw.slice(0, 2), 16);
  const green = parseInt(raw.slice(2, 4), 16);
  const blue = parseInt(raw.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

/**
 * Splash banner. The quarterly colour shows until the file is on screen.
 * A picture that has already loaded stays up until the next one is ready,
 * so Adult / InVerse does not flash empty. No tint on the picture.
 */
function SplashFill({
  uri,
  color,
  onError,
}: {
  uri: string;
  color: string;
  onError: () => void;
}) {
  const [painted, setPainted] = useState<string | null>(warmed.has(uri) ? uri : null);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} pointerEvents="none">
      {painted && painted !== uri ? (
        <Image
          source={{ uri: painted }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={splashCrop(uri)}
          cachePolicy="memory-disk"
          transition={0}
        />
      ) : null}
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={splashCrop(uri)}
        cachePolicy="memory-disk"
        recyclingKey={uri}
        priority="high"
        transition={0}
        onLoad={() => setPainted(uri)}
        onError={onError}
        accessibilityElementsHidden
        importantForAccessibility="no"
        alt=""
      />
    </View>
  );
}

export function SabbathSchoolCardSurface({
  quarterCode,
  coverUrl,
  color,
  testID,
  bannerAccessory,
  children,
}: {
  quarterCode?: string | null;
  coverUrl?: string | null;
  color: string;
  testID?: string;
  /** Lesson pill. Sits on the banner when there is a picture, otherwise at the top of the panel. */
  bannerAccessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { splash, cover } = siblingArtwork(quarterCode, coverUrl);
  const [splashFailed, setSplashFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setSplashFailed(false);
  }, [splash]);

  useEffect(() => {
    setCoverFailed(false);
  }, [cover]);

  useEffect(() => {
    warmSabbathSchoolImages(siblingArtwork(quarterCode, coverUrl).uris);
  }, [quarterCode, coverUrl]);

  const theme = getSabbathSchoolQuarterTheme(color);
  const showSplash = !!splash && !splashFailed;
  const showCover = !showSplash && !!cover && !coverFailed;
  const showBanner = showSplash || showCover;

  return (
    <View style={{ backgroundColor: theme.primary }} testID={testID}>
      {showBanner ? (
        <View style={[s.banner, { backgroundColor: theme.primary }]}>
          {showSplash && splash ? (
            <SplashFill uri={splash} color={theme.primary} onError={() => setSplashFailed(true)} />
          ) : null}
          {showCover && cover ? (
            <View style={s.coverHold}>
              <SabbathSchoolArtwork
                uri={cover}
                title="Sabbath School"
                color={theme.primary}
                width={SABBATH_SCHOOL_COVER_FRAME.width}
                height={SABBATH_SCHOOL_COVER_FRAME.height}
                radius={10}
                onError={() => setCoverFailed(true)}
              />
            </View>
          ) : null}
          {bannerAccessory ? <View style={s.pillSlot}>{bannerAccessory}</View> : null}
          <LinearGradient
            colors={[hexToRgba(theme.primary, 0), theme.primary]}
            style={s.fade}
            pointerEvents="none"
          />
        </View>
      ) : null}
      <View style={{ backgroundColor: theme.primary }}>
        {!showBanner && bannerAccessory ? <View style={s.panelPill}>{bannerAccessory}</View> : null}
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    height: SABBATH_SCHOOL_BANNER_HEIGHT,
    overflow: "hidden",
  },
  coverHold: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSlot: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SABBATH_SCHOOL_BANNER_FADE,
  },
  panelPill: {
    alignSelf: "flex-end",
    marginTop: 16,
    marginRight: 16,
  },
});
