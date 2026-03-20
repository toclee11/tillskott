import type {
  EvidenceQuality,
  IngestionCandidate,
  ReviewEntry,
  Substance,
} from "@/lib/types";

import {
  getSubstanceBySlug as repoGetSubstanceBySlug,
  listSubstances,
} from "@/lib/repos/substancesRepo";
import { getSourceById as repoGetSourceById } from "@/lib/repos/sourcesRepo";
import { isMandatoryTrustedSourceType } from "@/lib/trusted-sources";
import {
  getReviewQueue as repoGetReviewQueue,
  upsertReviewEntry as repoUpsertReviewEntry,
} from "@/lib/repos/reviewRepo";

const sourceWeight: Record<string, number> = {
  cochrane_review: 5,
  sbu_report: 4,
  pubmed_meta_analysis: 3,
  pubmed_systematic_review: 2,
  rct: 1,
};

const qualityWeight: Record<EvidenceQuality, number> = {
  high: 4,
  moderate: 3,
  low: 2,
  very_low: 1,
};

export async function getSubstances(): Promise<Substance[]> {
  // Substances are fetched via repo. Repo currently falls back to seed.
  return listSubstances();
}

export async function getSubstanceBySlug(
  slug: string,
): Promise<Substance | undefined> {
  return repoGetSubstanceBySlug(slug);
}

export async function searchSubstances(query: string): Promise<Substance[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return listSubstances();
  }

  const all = await listSubstances();
  const filtered = all.filter((substance) => {
      const haystack = [
        substance.name.toLowerCase(),
        substance.slug.toLowerCase(),
        substance.summaryPublic.toLowerCase(),
        ...substance.synonyms.map((item) => item.toLowerCase()),
      ];

      return haystack.some((value) => value.includes(normalized));
    });

  const scored = await Promise.all(
    filtered.map(async (substance) => ({
      substance,
      score: await getEvidenceScore(substance),
    })),
  );

  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.substance);
}

export async function getSourceById(sourceId: string) {
  return repoGetSourceById(sourceId);
}

/** True if substance has any evidence from Cochrane, SBU or meta-analysis. */
export async function hasMandatoryTrustedEvidence(
  substance: Substance,
): Promise<boolean> {
  for (const rec of substance.evidence) {
    const src = await getSourceById(rec.sourceId);
    if (src && isMandatoryTrustedSourceType(src.type)) return true;
  }
  return false;
}

export async function getEvidenceScore(substance: Substance): Promise<number> {
  const parts = await Promise.all(
    substance.evidence.map(async (record) => {
      const source = await getSourceById(record.sourceId);
      if (!source) return 0;
      return qualityWeight[record.quality] * (sourceWeight[source.type] ?? 0);
    }),
  );

  return parts.reduce((sum, n) => sum + n, 0);
}

export async function getReviewQueue(): Promise<ReviewEntry[]> {
  return repoGetReviewQueue();
}

export async function upsertReviewEntry(entry: ReviewEntry): Promise<ReviewEntry> {
  return repoUpsertReviewEntry(entry);
}

export function deduplicateCandidates(candidates: IngestionCandidate[]) {
  const seen = new Set<string>();
  const deduplicated: IngestionCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.substanceSlug}:${candidate.source.title}:${candidate.source.year}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduplicated.push(candidate);
  }

  return deduplicated;
}

export function rankCandidates(candidates: IngestionCandidate[]) {
  return [...candidates].sort((left, right) => {
    const leftWeight = sourceWeight[left.source.type] ?? 0;
    const rightWeight = sourceWeight[right.source.type] ?? 0;
    return rightWeight - leftWeight || right.source.year - left.source.year;
  });
}
