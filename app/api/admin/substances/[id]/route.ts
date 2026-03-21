import { NextResponse } from "next/server";
import { z } from "zod";

import { substances as seedSubstances } from "@/data/seed";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDbPool } from "@/lib/db";

const payloadSchema = z.object({
  commonDoseRange: z.string().min(3),
  summaryPublic: z.string().min(10),
  summaryClinical: z.string().min(10),
  contraindications: z.array(z.string()),
  interactions: z.array(z.string()),
});

function textAreaToList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const { id } = await params;
  const formData = await request.formData();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin");

  const parsed = payloadSchema.safeParse({
    commonDoseRange: formData.get("commonDoseRange"),
    summaryPublic: formData.get("summaryPublic"),
    summaryClinical: formData.get("summaryClinical"),
    contraindications: textAreaToList(formData.get("contraindications")),
    interactions: textAreaToList(formData.get("interactions")),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pool = getDbPool();
  if (!pool) {
    const target = seedSubstances.find((item) => item.id === id);
    if (target) {
      target.commonDoseRange = parsed.data.commonDoseRange;
      target.summaryPublic = parsed.data.summaryPublic;
      target.summaryClinical = parsed.data.summaryClinical;
      target.contraindications = parsed.data.contraindications;
      target.interactions = parsed.data.interactions;
    }
  } else {
    await pool.query(
      `
        update substances
        set common_dose_range = $2,
            summary_public = $3,
            summary_clinical = $4,
            contraindications = $5,
            interactions = $6,
            updated_at = now()
        where id = $1
      `,
      [
        id,
        parsed.data.commonDoseRange,
        parsed.data.summaryPublic,
        parsed.data.summaryClinical,
        parsed.data.contraindications,
        parsed.data.interactions,
      ],
    );
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
