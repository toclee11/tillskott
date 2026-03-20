import Link from "next/link";

import { getReviewQueue } from "@/lib/evidence";
import { reviewStatusToSwedish } from "@/lib/swedish-labels";

export default async function ReviewPage() {
  const queue = await getReviewQueue();

  return (
    <main className="mx-auto w-full max-w-5xl p-6 md:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Redaktionell granskningskö</h1>
        <Link className="text-sm underline" href="/">
          Till startsidan
        </Link>
      </div>

      <p className="mt-3 text-sm text-zinc-700">
        Publiceringsregel: endast poster med status <strong>Godkänd</strong> får
        visas i publika faktablad. Alla andra statusar måste hanteras av
        granskare.
      </p>

      <div className="mt-6 space-y-3">
        {queue.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold">{entry.claim}</p>
            <p className="mt-1 text-xs text-zinc-600">
              Inskickad av {entry.submittedBy} | {entry.submittedAt}
            </p>
            <p className="mt-2 text-sm text-zinc-700">{entry.rationale}</p>
            <p className="mt-2 text-xs">
              Status:{" "}
              <span className="font-semibold">
                {reviewStatusToSwedish(entry.status)}
              </span>
            </p>
            {entry.reviewerComment ? (
              <p className="mt-1 text-xs text-zinc-700">
                Kommentar: {entry.reviewerComment}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
