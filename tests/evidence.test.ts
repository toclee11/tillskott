import { describe, expect, it } from "vitest";

import { deduplicateCandidates, getSubstances, rankCandidates, searchSubstances } from "@/lib/evidence";
import { buildMockIngestionBatch, runIngestionPipeline } from "@/lib/pipeline";

describe("evidence search", () => {
  it("returns seeded substances for empty query", async () => {
    const results = await searchSubstances("");
    expect(results.length).toBe((await getSubstances()).length);
  });

  it("matches synonyms", async () => {
    const results = await searchSubstances("kolekalciferol");
    expect(results[0]?.slug).toBe("vitamin-d");
  });
});

describe("pipeline mechanics", () => {
  it("deduplicates equal title-year-substance candidates", () => {
    const batch = buildMockIngestionBatch();
    const deduped = deduplicateCandidates(batch);
    expect(deduped.length).toBeLessThan(batch.length);
  });

  it("ranks higher trust sources first", () => {
    const batch = buildMockIngestionBatch();
    const ranked = rankCandidates(batch);
    expect(ranked[0].source.type).toBe("cochrane_review");
  });

  it("creates review queue entries from ingestion output", () => {
    const result = runIngestionPipeline();
    expect(result.reviewEntries.length).toBe(result.rankedCount);
    expect(result.reviewEntries[0]?.status).toBe("pending");
  });
});
