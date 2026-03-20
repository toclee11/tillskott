export type SourceType =
  | "cochrane_review"
  | "sbu_report"
  | "pubmed_meta_analysis"
  | "pubmed_systematic_review"
  | "rct";

export type EvidenceQuality = "high" | "moderate" | "low" | "very_low";
export type AudienceMode = "public" | "clinical";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface EvidenceSource {
  id: string;
  type: SourceType;
  title: string;
  url: string;
  journalOrPublisher: string;
  year: number;
  pubmedId?: string;
}

export interface EvidenceRecord {
  id: string;
  indication: string;
  population: string;
  intervention: string;
  comparator: string;
  outcome: string;
  effectSize: string;
  adverseEffects: string;
  confidenceNotes: string;
  quality: EvidenceQuality;
  sourceId: string;
  lastReviewedAt: string;
}

export interface Substance {
  id: string;
  slug: string;
  name: string;
  synonyms: string[];
  category: "vitamin" | "mineral" | "supplement";
  commonDoseRange: string;
  summaryPublic: string;
  summaryClinical: string;
  absorptionProcess?: string;
  /** Evidenskällor som stödjer beskrivningen av upptag (kliniskt läge). */
  absorptionSourceIds?: string[];
  distributionOrganProcess?: string;
  /** Evidenskällor som stödjer beskrivningen av verkan/fördelning i kroppen. */
  distributionSourceIds?: string[];
  metabolismProcess?: string;
  /** Evidenskällor som stödjer beskrivningen av metabolism/clearance. */
  metabolismSourceIds?: string[];
  contraindications: string[];
  interactions: string[];
  evidence: EvidenceRecord[];
}

export interface ReviewEntry {
  id: string;
  substanceId: string;
  submittedBy: string;
  submittedAt: string;
  claim: string;
  rationale: string;
  sourceIds: string[];
  status: ReviewStatus;
  reviewerComment?: string;
}

export interface IngestionCandidate {
  id: string;
  source: EvidenceSource;
  substanceSlug: string;
  abstractSummary: string;
  keywords: string[];
}
