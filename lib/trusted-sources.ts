import type { SourceType } from "@/lib/types";

// Enligt önskemål:
// - Alltid: Cochrane reviews, SBU-rapporter och PubMed meta-analyser
// - Valfritt: PubMed systematic reviews, visas bara om användaren trycker på knapp.
export const mandatoryTrustedSourceTypes: SourceType[] = [
  "cochrane_review",
  "sbu_report",
  "pubmed_meta_analysis",
];

export const optionalTrustedSourceTypes: SourceType[] = [
  "pubmed_systematic_review",
];

export function isMandatoryTrustedSourceType(type: SourceType) {
  return mandatoryTrustedSourceTypes.includes(type);
}

export function isOptionalTrustedSourceType(type: SourceType) {
  return optionalTrustedSourceTypes.includes(type);
}

