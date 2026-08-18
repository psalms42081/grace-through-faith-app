// Path B Home v2 — shared visual constants (Brief 01 §1.2–1.4)
import { PathB } from "@/constants/colors";

export const HV2 = {
  ...PathB,
  // WCAG §1.4: PathB.inkMuted (#8A8A8A) is only ~3.0:1 on the cream surface —
  // fine for icons/decoration, but small meta TEXT uses this darker muted (≥4.5:1).
  inkMutedText: "#6B6660",
  // WCAG §1.4: brief ssGradient light end #4CAF8E is 2.7:1 against white text;
  // darkened to #2B8467 (≥4.5:1) per the brief's "darken the light end" rule.
  ssGradientSafe: ["#1F7A70", "#2B8467"] as const,
  cardShadow: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  rowShadow: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
};

export const F = {
  loraSemi: "Lora_600SemiBold",
  loraBold: "Lora_700Bold",
  inter: "Inter_400Regular",
  interMed: "Inter_500Medium",
  interSemi: "Inter_600SemiBold",
  interBold: "Inter_700Bold",
};
