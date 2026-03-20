import { getReviewQueue, upsertReviewEntry } from "@/lib/evidence";
import { getDbPool } from "@/lib/db";
import { z } from "zod";
import type { EvidenceQuality } from "@/lib/types";

const updateSchema = z.object({
  id: z.string().min(3),
  status: z.enum(["approved", "rejected", "pending"]),
  reviewerComment: z.string().min(3).max(400).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const pool = getDbPool();

  // No DB => fall back to in-memory behavior.
  if (!pool) {
    const existing = (await getReviewQueue()).find(
      (entry) => entry.id === parsed.data.id,
    );
    if (!existing) {
      return Response.json(
        { error: "Review entry not found" },
        { status: 404 },
      );
    }

    const updated = await upsertReviewEntry({
      ...existing,
      status: parsed.data.status,
      reviewerComment: parsed.data.reviewerComment,
    });

    return Response.json({ updated: true, entry: updated });
  }

  const existingRes = await pool.query<{
    id: string;
    substance_id: string;
    evidence_payload: unknown;
  }>(`select id, substance_id, evidence_payload from review_entries where id = $1`, [
    parsed.data.id,
  ]);

  const existing = existingRes.rows[0];
  if (!existing) {
    return Response.json(
      { error: "Review entry not found" },
      { status: 404 },
    );
  }

  // If approved: promote evidence from evidence_payload -> evidence_records.
  if (parsed.data.status === "approved") {
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
      lastReviewedAt?: string;
    };

    type PhysiologyUpdatePayload = {
      kind?: "absorption" | "distribution" | "metabolism";
      text?: string;
      sourceIds?: string[];
    };

    const payload = existing.evidence_payload as
      | { evidenceRecord?: EvidenceRecordPayload; physiologyUpdate?: PhysiologyUpdatePayload }
      | null
      | undefined;

    const record = payload?.evidenceRecord;
    const physiologyUpdate = payload?.physiologyUpdate;

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
            existing.substance_id,
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
      }
    }

    // Physiology MVP: if the review entry contains a physiologyUpdate payload,
    // apply it to the corresponding process fields on the substance.
    if (
      physiologyUpdate?.kind &&
      typeof physiologyUpdate.text === "string"
    ) {
      const sourceIds = physiologyUpdate.sourceIds ?? [];
      const updatedAt = new Date().toISOString();

      if (physiologyUpdate.kind === "absorption") {
        await pool.query(
          `
            update substances
            set absorption_process = $2,
                absorption_source_ids = $3,
                updated_at = $4
            where id = $1
          `,
          [existing.substance_id, physiologyUpdate.text, sourceIds, updatedAt],
        );
      } else if (physiologyUpdate.kind === "distribution") {
        await pool.query(
          `
            update substances
            set distribution_organ_process = $2,
                distribution_source_ids = $3,
                updated_at = $4
            where id = $1
          `,
          [existing.substance_id, physiologyUpdate.text, sourceIds, updatedAt],
        );
      } else if (physiologyUpdate.kind === "metabolism") {
        await pool.query(
          `
            update substances
            set metabolism_process = $2,
                metabolism_source_ids = $3,
                updated_at = $4
            where id = $1
          `,
          [existing.substance_id, physiologyUpdate.text, sourceIds, updatedAt],
        );
      }
    }
  }

  await pool.query(
    `update review_entries set status = $2, reviewer_comment = $3 where id = $1`,
    [parsed.data.id, parsed.data.status, parsed.data.reviewerComment ?? null],
  );

  // Return updated view (minimal).
  const updated = await pool.query<{
    id: string;
    substance_id: string;
    submitted_by: string;
    submitted_at: Date;
    claim: string;
    rationale: string;
    source_ids: string[] | null;
    status: "pending" | "approved" | "rejected";
    reviewer_comment: string | null;
  }>(
    `select id, substance_id, submitted_by, submitted_at, claim, rationale, source_ids, status, reviewer_comment
     from review_entries where id = $1`,
    [parsed.data.id],
  );

  const row = updated.rows[0];
  return Response.json({
    updated: true,
    entry: row
      ? {
          id: row.id,
          substanceId: row.substance_id,
          submittedBy: row.submitted_by,
          submittedAt: row.submitted_at.toISOString(),
          claim: row.claim,
          rationale: row.rationale,
          sourceIds: row.source_ids ?? [],
          status: row.status,
          reviewerComment: row.reviewer_comment ?? undefined,
        }
      : null,
  });
}
