import { NextResponse } from "next/server";
import { z } from "zod";

import { substances as seedSubstances } from "@/data/seed";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDbPool } from "@/lib/db";
import type { EvidenceQuality } from "@/lib/types";

const payloadSchema = z.object({
  indication: z.string().min(3),
  effectSize: z.string().min(3),
  confidenceNotes: z.string().min(3),
  quality: z.enum(["high", "moderate", "low", "very_low"]),
  sourceId: z.string().min(3),
  lastReviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const { id } = await params;
  const formData = await request.formData();
  const substanceSlug = String(formData.get("substanceSlug") ?? "");

  const parsed = payloadSchema.safeParse({
    indication: formData.get("indication"),
    effectSize: formData.get("effectSize"),
    confidenceNotes: formData.get("confidenceNotes"),
    quality: formData.get("quality"),
    sourceId: formData.get("sourceId"),
    lastReviewedAt: formData.get("lastReviewedAt"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pool = getDbPool();
  if (!pool) {
    for (const substance of seedSubstances) {
      const record = substance.evidence.find((item) => item.id === id);
      if (!record) continue;
      record.indication = parsed.data.indication;
      record.effectSize = parsed.data.effectSize;
      record.confidenceNotes = parsed.data.confidenceNotes;
      record.quality = parsed.data.quality as EvidenceQuality;
      record.sourceId = parsed.data.sourceId;
      record.lastReviewedAt = parsed.data.lastReviewedAt;
      break;
    }
  } else {
    await pool.query(
      `
        update evidence_records
        set indication = $2,
            effect_size = $3,
            confidence_notes = $4,
            quality = $5,
            source_id = $6,
            last_reviewed_at = $7
        where id = $1
      `,
      [
        id,
        parsed.data.indication,
        parsed.data.effectSize,
        parsed.data.confidenceNotes,
        parsed.data.quality,
        parsed.data.sourceId,
        parsed.data.lastReviewedAt,
      ],
    );
  }

  const redirectTo = substanceSlug
    ? `/admin/substances/${substanceSlug}`
    : "/admin";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
