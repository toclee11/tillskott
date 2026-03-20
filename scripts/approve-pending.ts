import { Pool } from "pg";
import type { EvidenceQuality } from "@/lib/types";

type EvidenceRecordPayload = {
  id?: string;
  sourceId?: string;
  indication?: string;
  population?: string;
  intervention?: string;
  comparator?: string;
  outcome?: string;
  effectSize?: string;
  adverseEffects?: string;
  confidenceNotes?: string;
  quality?: EvidenceQuality;
  lastReviewedAt?: string | null;
};

type PhysiologyUpdatePayload = {
  kind?: "absorption" | "distribution" | "metabolism";
  text?: string;
  sourceIds?: string[];
};

type EvidencePayload = {
  evidenceRecord?: EvidenceRecordPayload;
  physiologyUpdate?: PhysiologyUpdatePayload;
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("No DATABASE_URL set; approve-pending did nothing.");
    return;
  }

  const pool = new Pool({ connectionString });

  const pending = await pool.query<{
    id: string;
    substance_id: string;
    evidence_payload: EvidencePayload | null;
  }>(
    `
      select id, substance_id, evidence_payload
      from review_entries
      where status = 'pending'
    `,
  );

  let promotedEvidence = 0;
  let promotedPhysiology = 0;
  let approvedCount = 0;

  for (const row of pending.rows) {
    const payload = row.evidence_payload ?? {};

    const record = payload.evidenceRecord;
    if (record?.id && record?.sourceId) {
      const lastReviewedAt = record.lastReviewedAt;
      if (typeof lastReviewedAt === "string" && lastReviewedAt.length > 0) {
        await pool.query(
          `
            insert into evidence_records(
              id, substance_id, source_id,
              indication, population, intervention, comparator, outcome,
              effect_size, adverse_effects, confidence_notes,
              quality, last_reviewed_at
            )
            values (
              $1,$2,$3,
              $4,$5,$6,$7,$8,
              $9,$10,$11,
              $12,$13
            )
            on conflict (id) do update set
              substance_id = excluded.substance_id,
              source_id = excluded.source_id,
              indication = excluded.indication,
              population = excluded.population,
              intervention = excluded.intervention,
              comparator = excluded.comparator,
              outcome = excluded.outcome,
              effect_size = excluded.effect_size,
              adverse_effects = excluded.adverse_effects,
              confidence_notes = excluded.confidence_notes,
              quality = excluded.quality,
              last_reviewed_at = excluded.last_reviewed_at
          `,
          [
            record.id,
            row.substance_id,
            record.sourceId,
            record.indication ?? "Okänd indikation",
            record.population ?? "Okänd population",
            record.intervention ?? "Okänd intervention",
            record.comparator ?? "Okänd jämförelse",
            record.outcome ?? "Okänt utfall",
            record.effectSize ?? "Okänd effekt",
            record.adverseEffects ?? "Okända biverkningar",
            record.confidenceNotes ?? "Okända osäkerheter",
            record.quality ?? "moderate",
            lastReviewedAt,
          ],
        );
        promotedEvidence += 1;
      }
    }

    const physiologyUpdate = payload.physiologyUpdate;
    if (
      physiologyUpdate?.kind &&
      typeof physiologyUpdate.text === "string" &&
      physiologyUpdate.text.length > 0
    ) {
      const sourceIds = physiologyUpdate.sourceIds ?? [];
      if (physiologyUpdate.kind === "absorption") {
        await pool.query(
          `
            update substances
            set absorption_process = $2,
                absorption_source_ids = $3,
                updated_at = now()
            where id = $1
          `,
          [row.substance_id, physiologyUpdate.text, sourceIds],
        );
      } else if (physiologyUpdate.kind === "distribution") {
        await pool.query(
          `
            update substances
            set distribution_organ_process = $2,
                distribution_source_ids = $3,
                updated_at = now()
            where id = $1
          `,
          [row.substance_id, physiologyUpdate.text, sourceIds],
        );
      } else if (physiologyUpdate.kind === "metabolism") {
        await pool.query(
          `
            update substances
            set metabolism_process = $2,
                metabolism_source_ids = $3,
                updated_at = now()
            where id = $1
          `,
          [row.substance_id, physiologyUpdate.text, sourceIds],
        );
      }
      promotedPhysiology += 1;
    }

    await pool.query(
      `
        update review_entries
        set status = 'approved',
            reviewer_comment = coalesce(reviewer_comment, $2)
        where id = $1
      `,
      [row.id, "Auto-godkänd via scripts/approve-pending.ts"],
    );
    approvedCount += 1;
  }

  console.log(
    JSON.stringify(
      {
        pendingReviewed: pending.rows.length,
        approvedCount,
        promotedEvidence,
        promotedPhysiology,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

