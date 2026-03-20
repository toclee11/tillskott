import { sources, substances } from "@/data/seed";

const MAX_REVIEW_AGE_DAYS = 365;

function daysSince(dateIso: string) {
  const now = Date.now();
  const then = Date.parse(dateIso);
  const diffMs = now - then;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function main() {
  const warnings: string[] = [];

  for (const source of sources) {
    if (!source.url.startsWith("https://")) {
      warnings.push(`Source ${source.id} has non-https URL`);
    }
  }

  for (const substance of substances) {
    for (const evidence of substance.evidence) {
      const age = daysSince(evidence.lastReviewedAt);
      if (age > MAX_REVIEW_AGE_DAYS) {
        warnings.push(
          `Evidence ${evidence.id} is stale (${age} days since review)`,
        );
      }

      if (!sources.find((source) => source.id === evidence.sourceId)) {
        warnings.push(`Evidence ${evidence.id} references missing source`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        checkedSubstances: substances.length,
        checkedSources: sources.length,
        warningsCount: warnings.length,
        warnings,
      },
      null,
      2,
    ),
  );

  if (warnings.length > 0) {
    process.exitCode = 1;
  }
}

main();
