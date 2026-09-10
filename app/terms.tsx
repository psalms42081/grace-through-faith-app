import React from "react";
import { LegalScreen } from "@/components/legal/LegalScreen";
import { LEGAL_TERMS } from "@/lib/legal/generated";

export default function TermsScreen() {
  return <LegalScreen title="Terms of Use" doc={LEGAL_TERMS} />;
}
