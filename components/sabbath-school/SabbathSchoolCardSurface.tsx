import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  getSabbathSchoolQuarterTheme,
  sabbathSchoolSplashScrim,
} from "@/lib/sabbath-school-quarter-theme";
import {
  sabbathSchoolCoverUrl,
  sabbathSchoolSplashUrl,
} from "@/lib/sabbath-school-artwork";
import {
  quarterBaseCode,
  quarterCodeForTrack,
  type SabbathSchoolTrackId,
} from "@/lib/sabbath-school-tracks";

const warmed = new Set<string>();

/**
 * Zoom toward the top-left of the splash and let the card clip the rest,
 * so the dove or lighthouse lands in the right half, clear of the title.
 */
const splashFocus = {
  position: "absolute" as const,
  width: "142%",
  height: "142%",
  left: 0,
  top: 0,
};

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
 * Full-card splash. The quarterly colour shows until the file is on screen.
 * A picture that has already loaded stays up until the next one is ready,
 * so Adult / InVerse does not flash empty.
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
          style={splashFocus}
          contentFit="cover"
          contentPosition="left top"
          cachePolicy="memory-disk"
          transition={0}
        />
      ) : null}
      <Image
        source={{ uri }}
        style={splashFocus}
        contentFit="cover"
        contentPosition="left top"
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
  children,
}: {
  quarterCode?: string | null;
  coverUrl?: string | null;
  color: string;
  testID?: string;
  children: (art: {
    showSplash: boolean;
    showCover: boolean;
    coverUri: string | null;
    onCoverError: () => void;
  }) => React.ReactNode;
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

  const showSplash = !!splash && !splashFailed;
  const showCover = !showSplash && !!cover && !coverFailed;
  const theme = getSabbathSchoolQuarterTheme(color);
  const scrim = sabbathSchoolSplashScrim(color);

  return (
    <View style={{ backgroundColor: showSplash ? color : theme.primary }} testID={testID}>
      {showSplash && splash ? (
        <>
          <SplashFill uri={splash} color={color} onError={() => setSplashFailed(true)} />
          <LinearGradient
            colors={[scrim.strong, scrim.strong, scrim.light]}
            locations={[0, 0.32, 0.68]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[scrim.clear, scrim.bottom]}
            locations={[0.62, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </>
      ) : (
        <LinearGradient
          colors={[...theme.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children({
        showSplash,
        showCover,
        coverUri: cover,
        onCoverError: () => setCoverFailed(true),
      })}
    </View>
  );
}
