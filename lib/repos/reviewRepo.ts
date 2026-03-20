import { reviewQueue as seedReviewQueue } from "@/data/seed";
import type { ReviewEntry } from "@/lib/types";
import { getDbPool } from "@/lib/db";

export async function getReviewQueue(): Promise<ReviewEntry[]> {
  const pool = getDbPool();
  if (!pool) return seedReviewQueue;

  const res = await pool.query<{
    id: string;
    substance_id: string;
    submitted_by: string;
    submitted_at: Date;
    claim: string;
    rationale: string;
    source_ids: string[] | null;
    status: ReviewEntry["status"];
    reviewer_comment: string | null;
  }>(
    `
      select
        id,
        substance_id,
        submitted_by,
        submitted_at,
        claim,
        rationale,
        source_ids,
        status,
        reviewer_comment
      from review_entries
      order by submitted_at desc
    `,
  );

  return res.rows.map((row) => ({
    id: row.id,
    substanceId: row.substance_id,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at.toISOString(),
    claim: row.claim,
    rationale: row.rationale,
    sourceIds: row.source_ids ?? [],
    status: row.status,
    reviewerComment: row.reviewer_comment ?? undefined,
  }));
}

export async function upsertReviewEntry(entry: ReviewEntry): Promise<ReviewEntry> {
  const pool = getDbPool();
  if (!pool) {
    const existingIndex = seedReviewQueue.findIndex(
      (item) => item.id === entry.id,
    );
    if (existingIndex >= 0) {
      seedReviewQueue[existingIndex] = entry;
      return entry;
    }

    seedReviewQueue.push(entry);
    return entry;
  }

  // TODO(db): Implement real upsert.
  const submittedAt = new Date().toISOString();
  await pool.query(
    `
      insert into review_entries(
        id, substance_id, submitted_by, submitted_at,
        claim, rationale, source_ids, status, reviewer_comment, evidence_payload
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,null::jsonb)
      on conflict (id) do update set
        claim = excluded.claim,
        rationale = excluded.rationale,
        source_ids = excluded.source_ids,
        status = excluded.status,
        reviewer_comment = excluded.reviewer_comment,
        submitted_at = excluded.submitted_at
    `,
    [
      entry.id,
      entry.substanceId,
      entry.submittedBy,
      submittedAt,
      entry.claim,
      entry.rationale,
      entry.sourceIds,
      entry.status,
      entry.reviewerComment ?? null,
    ],
  );

  return entry;
}

