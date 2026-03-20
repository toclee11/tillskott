import { substances as seedSubstances } from "@/data/seed";
import type { Substance } from "@/lib/types";
import { getDbPool } from "@/lib/db";

export async function listSubstances(): Promise<Substance[]> {
  const pool = getDbPool();
  if (!pool) return seedSubstances;

  const substancesRes = await pool.query<{
    id: string;
    slug: string;
    name: string;
    category: Substance["category"] | string;
    common_dose_range: string;
    summary_public: string;
    summary_clinical: string;
    absorption_process: string | null;
    absorption_source_ids: string[] | null;
    distribution_organ_process: string | null;
    distribution_source_ids: string[] | null;
    metabolism_process: string | null;
    metabolism_source_ids: string[] | null;
    contraindications: string[] | null;
    interactions: string[] | null;
  }>(
    `
      select
        id, slug, name, category, common_dose_range,
        summary_public, summary_clinical,
        absorption_process, absorption_source_ids,
        distribution_organ_process, distribution_source_ids,
        metabolism_process, metabolism_source_ids,
        contraindications, interactions
      from substances
      order by name asc
    `,
  );

  const out: Substance[] = [];

  for (const row of substancesRes.rows) {
    const synonymsRes = await pool.query<{ synonym: string }>(
      `select synonym from substance_synonyms where substance_id = $1`,
      [row.id],
    );

    const evidenceRes = await pool.query<{
      id: string;
      indication: string;
      population: string;
      intervention: string;
      comparator: string;
      outcome: string;
      effect_size: string;
      adverse_effects: string;
      confidence_notes: string;
      quality: Substance["evidence"][number]["quality"];
      source_id: string;
      last_reviewed_at: string | Date;
    }>(
      `
        select
          id, indication, population, intervention, comparator, outcome,
          effect_size, adverse_effects, confidence_notes,
          quality, source_id, last_reviewed_at
        from evidence_records
        where substance_id = $1
      `,
      [row.id],
    );

    out.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category as Substance["category"],
      synonyms: synonymsRes.rows.map((r) => r.synonym),
      commonDoseRange: row.common_dose_range,
      summaryPublic: row.summary_public,
      summaryClinical: row.summary_clinical,
      absorptionProcess: row.absorption_process ?? undefined,
      absorptionSourceIds: row.absorption_source_ids ?? undefined,
      distributionOrganProcess: row.distribution_organ_process ?? undefined,
      distributionSourceIds: row.distribution_source_ids ?? undefined,
      metabolismProcess: row.metabolism_process ?? undefined,
      metabolismSourceIds: row.metabolism_source_ids ?? undefined,
      contraindications: row.contraindications ?? [],
      interactions: row.interactions ?? [],
      evidence: evidenceRes.rows.map((ev) => ({
        id: ev.id,
        indication: ev.indication,
        population: ev.population,
        intervention: ev.intervention,
        comparator: ev.comparator,
        outcome: ev.outcome,
        effectSize: ev.effect_size,
        adverseEffects: ev.adverse_effects,
        confidenceNotes: ev.confidence_notes,
        quality: ev.quality,
        sourceId: ev.source_id,
        lastReviewedAt:
          typeof ev.last_reviewed_at === "string"
            ? ev.last_reviewed_at
            : ev.last_reviewed_at.toISOString().slice(0, 10),
      })),
    });
  }

  return out;
}

export async function getSubstanceBySlug(
  slug: string,
): Promise<Substance | undefined> {
  const pool = getDbPool();
  if (!pool) return seedSubstances.find((s) => s.slug === slug);

  const substanceRes = await pool.query<{
    id: string;
    slug: string;
    name: string;
    category: Substance["category"] | string;
    common_dose_range: string;
    summary_public: string;
    summary_clinical: string;
    absorption_process: string | null;
    absorption_source_ids: string[] | null;
    distribution_organ_process: string | null;
    distribution_source_ids: string[] | null;
    metabolism_process: string | null;
    metabolism_source_ids: string[] | null;
    contraindications: string[] | null;
    interactions: string[] | null;
  }>(
    `
      select
        id, slug, name, category, common_dose_range,
        summary_public, summary_clinical,
        absorption_process, absorption_source_ids,
        distribution_organ_process, distribution_source_ids,
        metabolism_process, metabolism_source_ids,
        contraindications, interactions
      from substances
      where slug = $1
      limit 1
    `,
    [slug],
  );

  const row = substanceRes.rows[0];
  if (!row) return undefined;

  const synonymsRes = await pool.query<{ synonym: string }>(
    `select synonym from substance_synonyms where substance_id = $1`,
    [row.id],
  );

  const evidenceRes = await pool.query<{
    id: string;
    indication: string;
    population: string;
    intervention: string;
    comparator: string;
    outcome: string;
    effect_size: string;
    adverse_effects: string;
    confidence_notes: string;
    quality: Substance["evidence"][number]["quality"];
    source_id: string;
    last_reviewed_at: string | Date;
  }>(
    `
      select
        id, indication, population, intervention, comparator, outcome,
        effect_size, adverse_effects, confidence_notes,
        quality, source_id, last_reviewed_at
      from evidence_records
      where substance_id = $1
    `,
    [row.id],
  );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as Substance["category"],
    synonyms: synonymsRes.rows.map((r) => r.synonym),
    commonDoseRange: row.common_dose_range,
    summaryPublic: row.summary_public,
    summaryClinical: row.summary_clinical,
    absorptionProcess: row.absorption_process ?? undefined,
    absorptionSourceIds: row.absorption_source_ids ?? undefined,
    distributionOrganProcess: row.distribution_organ_process ?? undefined,
    distributionSourceIds: row.distribution_source_ids ?? undefined,
    metabolismProcess: row.metabolism_process ?? undefined,
    metabolismSourceIds: row.metabolism_source_ids ?? undefined,
    contraindications: row.contraindications ?? [],
    interactions: row.interactions ?? [],
    evidence: evidenceRes.rows.map((ev) => ({
      id: ev.id,
      indication: ev.indication,
      population: ev.population,
      intervention: ev.intervention,
      comparator: ev.comparator,
      outcome: ev.outcome,
      effectSize: ev.effect_size,
      adverseEffects: ev.adverse_effects,
      confidenceNotes: ev.confidence_notes,
      quality: ev.quality,
      sourceId: ev.source_id,
      lastReviewedAt:
        typeof ev.last_reviewed_at === "string"
          ? ev.last_reviewed_at
          : ev.last_reviewed_at.toISOString().slice(0, 10),
    })),
  };
}

