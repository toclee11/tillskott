import { upsertReviewEntry } from "@/lib/evidence";
import { reviewSubmissionSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reviewSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const entry = await upsertReviewEntry({
    id: `rev-${crypto.randomUUID().slice(0, 8)}`,
    ...parsed.data,
    submittedAt: new Date().toISOString(),
    status: "pending",
  });

  return Response.json({ saved: true, entry }, { status: 201 });
}
