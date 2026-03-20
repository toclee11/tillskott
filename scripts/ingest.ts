import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Pool, QueryResult } from "pg";

import { getDbPool } from "@/lib/db";
import { runIngestionPipeline } from "@/lib/pipeline";
import { substances as seedSubstances } from "@/data/seed";

function toYear(pubdate?: string) {
  if (!pubdate) return null;
  const m = pubdate.match(/\b(\d{4})\b/);
  return m ? Number(m[1]) : null;
}

function templateAbsorption(substanceName: string) {
  return `${substanceName} antas främst tas upp i mag-tarmkanalen och transporteras därefter till blodet. Upptaget kan påverkas av fettinnehåll, gallsyror och individuella skillnader i tarmfunktion. (Mekanismmall insatt via ETL – kräver granskning och källförankring.)`;
}

function templateDistribution(substanceName: string) {
  return `${substanceName} distribueras i kroppen via cirkulationen och kan omvandlas i organ innan den biologiskt aktiva formen uppstår. Distributionen styrs av vävnadsspecifika receptorer/transportörer och påverkas av metabol kapacitet samt relevant näringsstatus. (Mekanismmall insatt via ETL – kräver granskning och källförankring.)`;
}

function templateMetabolism(substanceName: string) {
  return `${substanceName} genomgår ofta biotransformation och kan vidare omvandlas till aktiva eller inaktiva metaboliter innan utsöndring. Metabolismen påverkas exempelvis av lever-/njurfunktion och av individens kalcium-/fosfat-/hormonella homeostas där det är relevant. (Mekanismmall insatt via ETL – kräver granskning och källförankring.)`;
}

async function pubmedSearchIds(term: string, retmax: number) {
  // PubMed E-utilities allow JSON output without auth.
  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    `?db=pubmed&term=${encodeURIComponent(term)}` +
    `&retmax=${retmax}&retmode=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed esearch failed: ${res.status}`);
  const data = (await res.json()) as unknown as {
    esearchresult?: { idlist?: string[] };
  };
  return (data.esearchresult?.idlist ?? []) as string[];
}

async function pubmedSummaries(ids: string[]) {
  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi" +
    `?db=pubmed&id=${encodeURIComponent(ids.join(","))}` +
    `&retmode=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed esummary failed: ${res.status}`);
  const data = (await res.json()) as unknown as {
    result?: Record<string, { title?: string; pubdate?: string }>;
  };
  // data.result is keyed by PMID, with fields like title/pubdate
  return data.result ?? {};
}

async function ensureSubstances(pool: Pool) {
  const now = new Date().toISOString();
  for (const s of seedSubstances) {
    const absorptionProcess =
      s.absorptionProcess ?? templateAbsorption(s.name);
    const distributionOrganProcess =
      s.distributionOrganProcess ?? templateDistribution(s.name);
    const metabolismProcess =
      s.metabolismProcess ?? templateMetabolism(s.name);

    await pool.query(
      `
        insert into substances (
          id, slug, name, category, common_dose_range,
          summary_public, summary_clinical,
          absorption_process, absorption_source_ids,
          distribution_organ_process, distribution_source_ids,
          metabolism_process, metabolism_source_ids,
          contraindications, interactions,
          updated_at
        )
        values (
          $1,$2,$3,$4,$5,
          $6,$7,
          $8,$9,
          $10,$11,
          $12,$13,
          $14,$15,
          $16
        )
        on conflict (slug) do update set
          name = excluded.name,
          category = excluded.category,
          common_dose_range = excluded.common_dose_range,
          summary_public = excluded.summary_public,
          summary_clinical = excluded.summary_clinical,
          absorption_process = excluded.absorption_process,
          absorption_source_ids = excluded.absorption_source_ids,
          distribution_organ_process = excluded.distribution_organ_process,
          distribution_source_ids = excluded.distribution_source_ids,
          metabolism_process = excluded.metabolism_process,
          metabolism_source_ids = excluded.metabolism_source_ids,
          contraindications = excluded.contraindications,
          interactions = excluded.interactions,
          updated_at = excluded.updated_at
      `,
      [
        s.id,
        s.slug,
        s.name,
        s.category,
        s.commonDoseRange,
        s.summaryPublic,
        s.summaryClinical,
        absorptionProcess,
        s.absorptionSourceIds ?? [],
        distributionOrganProcess,
        s.distributionSourceIds ?? [],
        metabolismProcess,
        s.metabolismSourceIds ?? [],
        s.contraindications,
        s.interactions,
        now,
      ],
    );

    // Synonyms
    for (const syn of s.synonyms) {
      await pool.query(
        `
          insert into substance_synonyms(substance_id, synonym)
          values ($1,$2)
          on conflict do nothing
        `,
        [s.id, syn],
      );
    }
  }
}

async function ingestPubMedMetaForSubstances() {
  const pool = getDbPool();
  if (!pool) {
    // Fallback: keep existing mock pipeline output.
    const result = runIngestionPipeline();
    const outputPath = resolve(process.cwd(), "data", "ingestion-output.json");
    writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(
      JSON.stringify(
        {
          message: "Ingestion completed (mock; no DATABASE_URL).",
          outputPath,
          ...result,
        },
        null,
        2,
      ),
    );
    return;
  }

  // Ensure substances exist.
  await ensureSubstances(pool);

  // Physiology MVP: if a process text or its source ids are missing,
  // create pending review entries with a physiologyUpdate payload.
  const nowIso = new Date().toISOString();
  for (const s of seedSubstances) {
    const needsAbsorption =
      !s.absorptionProcess || (s.absorptionSourceIds?.length ?? 0) === 0;
    const needsDistribution =
      !s.distributionOrganProcess ||
      (s.distributionSourceIds?.length ?? 0) === 0;
    const needsMetabolism =
      !s.metabolismProcess || (s.metabolismSourceIds?.length ?? 0) === 0;

    const physics: Array<
      { kind: "absorption" | "distribution" | "metabolism"; needs: boolean }
    > = [
      { kind: "absorption", needs: needsAbsorption },
      { kind: "distribution", needs: needsDistribution },
      { kind: "metabolism", needs: needsMetabolism },
    ];

    for (const item of physics) {
      if (!item.needs) continue;

      const text =
        item.kind === "absorption"
          ? templateAbsorption(s.name)
          : item.kind === "distribution"
            ? templateDistribution(s.name)
            : templateMetabolism(s.name);

      const sourceIds =
        item.kind === "absorption"
          ? s.absorptionSourceIds ?? []
          : item.kind === "distribution"
            ? s.distributionSourceIds ?? []
            : s.metabolismSourceIds ?? [];

      const reviewId = `phys-${s.slug}-${item.kind}`;
      await pool.query(
        `
          insert into review_entries(
            id, substance_id, submitted_by, submitted_at,
            claim, rationale,
            source_ids,
            evidence_payload,
            status
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          on conflict (id) do update set
            claim = excluded.claim,
            rationale = excluded.rationale,
            source_ids = excluded.source_ids,
            evidence_payload = excluded.evidence_payload,
            status = excluded.status,
            submitted_at = excluded.submitted_at
        `,
        [
          reviewId,
          s.id,
          "etl-physiology",
          nowIso,
          `${s.name}: ${item.kind === "absorption" ? "Upptag" : item.kind === "distribution" ? "Verkan i kroppen" : "Metabolism och clearance"} (mekanismmall)`,
          "ETL har lagt in en mekanismmall. Den behöver förankras i evidens och kan justeras av granskare.",
          sourceIds,
          {
            physiologyUpdate: {
              kind: item.kind,
              text,
              sourceIds,
            },
          },
          "pending",
        ],
      );
    }
  }

  const today = new Date();
  const lastReviewedAt = today.toISOString().slice(0, 10); // YYYY-MM-DD

  // For first run, we ingest the seed set.
  const slugs = seedSubstances.map((s) => s.slug);
  const termBySlug: Record<string, string> = {};
  for (const s of seedSubstances) {
    // Keep query broad; later refine to MeSH/classes.
    // Meta-analysis/systematic review is approximated via title terms.
    termBySlug[s.slug] = `${s.name} (meta-analysis[Title] OR "systematic review"[Title] OR systematic[Title])`;
  }

  // Fetch substans rows to get ids (not only from seed).
  const dbSubstances = await Promise.all(
    slugs.map(async (slug) => {
      const r: QueryResult<{ id: string; slug: string; name: string }> =
        await pool.query(
          "select id, slug, name from substances where slug = $1",
          [slug],
        );
      return r.rows[0] as { id: string; slug: string; name: string } | undefined;
    }),
  );

  for (const s of dbSubstances) {
    if (!s) continue;
    const term = termBySlug[s.slug] ?? s.name;

    // Get top N candidate PMIDs per substance.
    const pmids = await pubmedSearchIds(term, 5);
    if (pmids.length === 0) continue;

    const summaries = await pubmedSummaries(pmids);

    for (const pmid of pmids) {
      const summary = summaries[pmid] ?? {};
      const title = summary.title ?? `PubMed PMID ${pmid}`;
      const pubdate = summary.pubdate;
      const year = toYear(pubdate) ?? today.getFullYear();

      const sourceId = `src-pubmed-${pmid}`;
      const sourceType = "pubmed_meta_analysis" as const;
      const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      await pool.query(
        `
          insert into evidence_sources(id, source_type, title, url, journal_or_publisher, publication_year)
          values ($1,$2,$3,$4,$5,$6)
          on conflict (id) do update set
            source_type = excluded.source_type,
            title = excluded.title,
            url = excluded.url,
            journal_or_publisher = excluded.journal_or_publisher,
            publication_year = excluded.publication_year
        `,
        [
          sourceId,
          sourceType,
          title,
          url,
          "PubMed",
          year,
        ],
      );

      const reviewId = `cand-${s.slug}-${pmid}`;
      await pool.query(
        `
          insert into review_entries(
            id, substance_id, submitted_by, submitted_at,
            claim, rationale,
            source_ids,
            evidence_payload,
            status
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          on conflict (id) do update set
            claim = excluded.claim,
            rationale = excluded.rationale,
            source_ids = excluded.source_ids,
            evidence_payload = excluded.evidence_payload,
            status = excluded.status,
            submitted_at = excluded.submitted_at
        `,
        [
          reviewId,
          s.id,
          "etl-pubmed",
          new Date().toISOString(),
          `${s.name}: PubMed evidenskandidat`,
          "Skapad via ETL (PubMed E-utilities). Kräver granskning innan publicering.",
          [sourceId],
          {
            evidenceRecord: {
              id: `ev-${s.slug}-${pmid}`,
              indication: "Outcome enligt PubMed",
              population: "Okänd (ETL)",
              intervention: "Okänd (ETL)",
              comparator: "Okänd (ETL)",
              outcome: "Okänd (ETL)",
              effectSize: "Okänd (ETL)",
              adverseEffects: "Okända (ETL)",
              confidenceNotes: "Kräver manuell metod- och effektgranskning.",
              quality: "moderate",
              sourceId,
              lastReviewedAt,
            },
          },
          "pending",
        ],
      );
    }
  }

  console.log(JSON.stringify({ message: "Ingestion completed (PubMed ETL -> review_entries).", slugs }, null, 2));
}

ingestPubMedMetaForSubstances().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
