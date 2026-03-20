import { getReviewQueue } from "@/lib/evidence";

export async function GET() {
  const queue = (await getReviewQueue()).sort(
    (left, right) =>
      Date.parse(right.submittedAt) - Date.parse(left.submittedAt),
  );

  return Response.json({ total: queue.length, queue });
}
