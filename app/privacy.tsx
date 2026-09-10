import React from "react";
import { LegalScreen } from "@/components/legal/LegalScreen";
import { LEGAL_PRIVACY } from "@/lib/legal/generated";

export default function PrivacyScreen() {
  return <LegalScreen title="Privacy Policy" doc={LEGAL_PRIVACY} />;
}
