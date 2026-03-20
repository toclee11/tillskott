import { getSourceById, getSubstances } from "@/lib/evidence";
import type { AudienceMode } from "@/lib/types";
import { categoryToSwedish } from "@/lib/swedish-labels";
import { isMandatoryTrustedSourceType } from "@/lib/trusted-sources";

export async function buildSubstanceCards(audience: AudienceMode) {
  const substances = await getSubstances();

  return Promise.all(
    substances.map(async (substance) => {
      const evidenceCount = await Promise.all(
        substance.evidence.map(async (record) => {
          const source = await getSourceById(record.sourceId);
          if (!source) return 0;
          return isMandatoryTrustedSourceType(source.type) ? 1 : 0;
        }),
      ).then((arr) =>
        (arr as number[]).reduce((sum, n) => sum + n, 0),
      );

      return {
        slug: substance.slug,
        name: substance.name,
        category: categoryToSwedish(substance.category),
        summary:
          audience === "clinical"
            ? substance.summaryClinical
            : substance.summaryPublic,
        evidenceCount,
      };
    }),
  );
}

export async function buildEvidenceRows(slug: string) {
  const substances = await getSubstances();
  const substance = substances.find((item) => item.slug === slug);
  if (!substance) return null;

  return Promise.all(
    substance.evidence.map(async (record) => ({
      ...record,
      source: await getSourceById(record.sourceId),
    })),
  );
}
