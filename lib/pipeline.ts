import type { IngestionCandidate, ReviewEntry } from "@/lib/types";
import { deduplicateCandidates, rankCandidates } from "@/lib/evidence";

export function buildMockIngestionBatch(): IngestionCandidate[] {
  return [
    {
      id: "cand-001",
      substanceSlug: "vitamin-d",
      abstractSummary: "Updated pooled estimate for falls and fracture outcomes.",
      keywords: ["vitamin d", "fracture", "meta-analysis"],
      source: {
        id: "cand-src-001",
        type: "pubmed_meta_analysis",
        title: "Vitamin D supplementation outcomes update",
        url: "https://pubmed.ncbi.nlm.nih.gov/",
        journalOrPublisher: "PubMed",
        year: 2025,
      },
    },
    {
      id: "cand-002",
      substanceSlug: "vitamin-d",
      abstractSummary: "Updated pooled estimate for falls and fracture outcomes.",
      keywords: ["vitamin d", "fracture", "meta-analysis"],
      source: {
        id: "cand-src-001-dup",
        type: "pubmed_meta_analysis",
        title: "Vitamin D supplementation outcomes update",
        url: "https://pubmed.ncbi.nlm.nih.gov/",
        journalOrPublisher: "PubMed",
        year: 2025,
      },
    },
    {
      id: "cand-003",
      substanceSlug: "omega-3",
      abstractSummary: "Large review of omega-3 across CVD endpoints.",
      keywords: ["omega-3", "cvd", "systematic review"],
      source: {
        id: "cand-src-003",
        type: "cochrane_review",
        title: "Omega-3 and cardiovascular outcomes",
        url: "https://www.cochranelibrary.com/",
        journalOrPublisher: "Cochrane Library",
        year: 2024,
      },
    },
  ];
}

export function runIngestionPipeline() {
  const batch = buildMockIngestionBatch();
  const deduplicated = deduplicateCandidates(batch);
  const ranked = rankCandidates(deduplicated);

  const reviewEntries: ReviewEntry[] = ranked.map((candidate, index) => ({
    id: `rev-pipeline-${index + 1}`,
    substanceId: `sub-${candidate.substanceSlug}`,
    submittedBy: "pipeline-bot",
    submittedAt: new Date().toISOString(),
    claim: candidate.abstractSummary,
    rationale:
      "Auto-ingested candidate requires clinical and methodological review before publication.",
    sourceIds: [candidate.source.id],
    status: "pending",
  }));

  return {
    inputCount: batch.length,
    deduplicatedCount: deduplicated.length,
    rankedCount: ranked.length,
    reviewEntries,
  };
}
