import { useState, useEffect } from "react";
import { Platform } from "react-native";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function getJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045
  );
}

function getJulianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

function getSolarDeclination(t: number): number {
  const obliquityCorr =
    23.439291 - 0.0130042 * t - 1.64e-7 * t * t + 5.04e-7 * t * t * t;
  const geomMeanLongSun = (280.46646 + t * (36000.76983 + 0.0003032 * t)) % 360;
  const geomMeanAnomSun = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const sunEqOfCtr =
    Math.sin(geomMeanAnomSun * DEG_TO_RAD) *
      (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * geomMeanAnomSun * DEG_TO_RAD) *
      (0.019993 - 0.000101 * t) +
    Math.sin(3 * geomMeanAnomSun * DEG_TO_RAD) * 0.000289;
  const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
  const omega = 125.04 - 1934.136 * t;
  const sunAppLong =
    sunTrueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG_TO_RAD);
  const obliqCorr =
    obliquityCorr + 0.00256 * Math.cos(omega * DEG_TO_RAD);
  return (
    Math.asin(
      Math.sin(obliqCorr * DEG_TO_RAD) * Math.sin(sunAppLong * DEG_TO_RAD)
    ) * RAD_TO_DEG
  );
}

function getEquationOfTime(t: number): number {
  const obliquityCorr =
    23.439291 - 0.0130042 * t - 1.64e-7 * t * t + 5.04e-7 * t * t * t;
  const omega = 125.04 - 1934.136 * t;
  const obliqCorr =
    obliquityCorr + 0.00256 * Math.cos(omega * DEG_TO_RAD);
  const geomMeanLongSun = (280.46646 + t * (36000.76983 + 0.0003032 * t)) % 360;
  const geomMeanAnomSun = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccEarthOrbit = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const y = Math.tan((obliqCorr / 2) * DEG_TO_RAD);
  const yy = y * y;
  const eot =
    yy * Math.sin(2 * geomMeanLongSun * DEG_TO_RAD) -
    2 * eccEarthOrbit * Math.sin(geomMeanAnomSun * DEG_TO_RAD) +
    4 *
      eccEarthOrbit *
      yy *
      Math.sin(geomMeanAnomSun * DEG_TO_RAD) *
      Math.cos(2 * geomMeanLongSun * DEG_TO_RAD) -
    0.5 * yy * yy * Math.sin(4 * geomMeanLongSun * DEG_TO_RAD) -
    1.25 *
      eccEarthOrbit *
      eccEarthOrbit *
      Math.sin(2 * geomMeanAnomSun * DEG_TO_RAD);
  return 4 * eot * RAD_TO_DEG;
}

export function getSunsetTime(date: Date, lat: number, lng: number): Date {
  const jd = getJulianDay(date);
  const t = getJulianCentury(jd);
  const declination = getSolarDeclination(t);
  const eqTime = getEquationOfTime(t);

  const zenith = 90.833;
  const latRad = lat * DEG_TO_RAD;
  const declRad = declination * DEG_TO_RAD;

  const hourAngle =
    Math.acos(
      Math.cos(zenith * DEG_TO_RAD) /
        (Math.cos(latRad) * Math.cos(declRad)) -
        Math.tan(latRad) * Math.tan(declRad)
    ) * RAD_TO_DEG;

  const solarNoonMinutes = 720 - 4 * lng - eqTime;
  const sunsetMinutesUTC = solarNoonMinutes + hourAngle * 4;

  const sunset = new Date(date);
  sunset.setUTCHours(0, 0, 0, 0);
  sunset.setUTCMinutes(Math.round(sunsetMinutesUTC));

  return sunset;
}

export function getSabbathWindow(
  lat: number,
  lng: number
): {
  start: Date;
  end: Date;
  isActive: boolean;
  closingReflectionActive: boolean;
} {
  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();

  let friday: Date;
  let saturday: Date;

  if (dayOfWeek === 5) {
    friday = new Date(today);
    saturday = new Date(today);
    saturday.setDate(saturday.getDate() + 1);
  } else if (dayOfWeek === 6) {
    friday = new Date(today);
    friday.setDate(friday.getDate() - 1);
    saturday = new Date(today);
  } else {
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    friday = new Date(today);
    friday.setDate(friday.getDate() + daysUntilFriday);
    saturday = new Date(friday);
    saturday.setDate(saturday.getDate() + 1);
  }

  const fridayUTC = new Date(
    Date.UTC(friday.getFullYear(), friday.getMonth(), friday.getDate())
  );
  const saturdayUTC = new Date(
    Date.UTC(saturday.getFullYear(), saturday.getMonth(), saturday.getDate())
  );

  const sabbathStart = getSunsetTime(fridayUTC, lat, lng);
  const sabbathEnd = getSunsetTime(saturdayUTC, lat, lng);

  const isActive = now >= sabbathStart && now <= sabbathEnd;

  const twoHoursBeforeEnd = new Date(sabbathEnd.getTime() - 2 * 60 * 60 * 1000);
  const closingReflectionActive = isActive && now >= twoHoursBeforeEnd;

  return { start: sabbathStart, end: sabbathEnd, isActive, closingReflectionActive };
}

export type SabbathPhase = "friday-evening" | "sabbath-morning" | "afternoon" | "closing" | "outside";

export function getSabbathPhase(start: Date, end: Date): SabbathPhase {
  const now = new Date();
  if (now < start || now > end) return "outside";

  const midnight = new Date(start);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  const noon = new Date(midnight);
  noon.setHours(12, 0, 0, 0);

  const twoHoursBefore = new Date(end.getTime() - 2 * 60 * 60 * 1000);

  if (now < midnight) return "friday-evening";
  if (now < noon) return "sabbath-morning";
  if (now < twoHoursBefore) return "afternoon";
  return "closing";
}

interface SabbathState {
  isSabbath: boolean;
  closingReflectionActive: boolean;
  sabbathStart: Date | null;
  sabbathEnd: Date | null;
  loading: boolean;
}

export function useSabbath(enabled: boolean = true): SabbathState {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sabbathInfo, setSabbathInfo] = useState<{
    isSabbath: boolean;
    closingReflectionActive: boolean;
    sabbathStart: Date | null;
    sabbathEnd: Date | null;
  }>({
    isSabbath: false,
    closingReflectionActive: false,
    sabbathStart: null,
    sabbathEnd: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    async function getLocation() {
      try {
        if (Platform.OS !== "web") {
          const Location = await import("expo-location");
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
            });
            if (mounted) {
              setLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              return;
            }
          }
        } else {
          const pos = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
              });
            }
          );
          if (mounted) {
            setLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            return;
          }
        }
      } catch {
      }
      if (mounted) {
        setLocation({ lat: 40.7, lng: -74.0 });
      }
    }

    getLocation();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location) return;

    function update() {
      const window = getSabbathWindow(location!.lat, location!.lng);
      setSabbathInfo({
        isSabbath: window.isActive,
        closingReflectionActive: window.closingReflectionActive,
        sabbathStart: window.start,
        sabbathEnd: window.end,
      });
      setLoading(false);
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [location]);

  return {
    isSabbath: sabbathInfo.isSabbath,
    closingReflectionActive: sabbathInfo.closingReflectionActive,
    sabbathStart: sabbathInfo.sabbathStart,
    sabbathEnd: sabbathInfo.sabbathEnd,
    loading,
  };
}
