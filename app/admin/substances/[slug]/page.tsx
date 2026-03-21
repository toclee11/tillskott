import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getSources, getSubstanceBySlug } from "@/lib/evidence";

function listToText(values: string[]) {
  return values.join("\n");
}

type AdminSubstancePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminSubstancePage({ params }: AdminSubstancePageProps) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { slug } = await params;
  const substance = await getSubstanceBySlug(slug);
  if (!substance) notFound();
  const sources = await getSources();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link className="text-sm text-emerald-700 hover:text-emerald-800" href="/admin">
          ← Till admin
        </Link>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        Redigera {substance.name}
      </h1>

      <form
        method="post"
        action={`/api/admin/substances/${substance.id}`}
        className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="redirectTo" value={`/admin/substances/${substance.slug}`} />
        <h2 className="text-lg font-semibold text-zinc-900">Faktakort (substans)</h2>

        <label className="block text-sm font-medium text-zinc-700" htmlFor="commonDoseRange">
          Vanlig dos
        </label>
        <input
          id="commonDoseRange"
          name="commonDoseRange"
          defaultValue={substance.commonDoseRange}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          required
        />

        <label className="block text-sm font-medium text-zinc-700" htmlFor="summaryPublic">
          Sammanfattning (allmänhet)
        </label>
        <textarea
          id="summaryPublic"
          name="summaryPublic"
          defaultValue={substance.summaryPublic}
          className="min-h-28 w-full rounded-lg border border-zinc-300 px-3 py-2"
          required
        />

        <label className="block text-sm font-medium text-zinc-700" htmlFor="summaryClinical">
          Sammanfattning (klinisk)
        </label>
        <textarea
          id="summaryClinical"
          name="summaryClinical"
          defaultValue={substance.summaryClinical}
          className="min-h-28 w-full rounded-lg border border-zinc-300 px-3 py-2"
          required
        />

        <label className="block text-sm font-medium text-zinc-700" htmlFor="contraindications">
          Kontraindikationer (en per rad)
        </label>
        <textarea
          id="contraindications"
          name="contraindications"
          defaultValue={listToText(substance.contraindications)}
          className="min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <label className="block text-sm font-medium text-zinc-700" htmlFor="interactions">
          Interaktioner (en per rad)
        </label>
        <textarea
          id="interactions"
          name="interactions"
          defaultValue={listToText(substance.interactions)}
          className="min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2"
        />

        <button
          type="submit"
          className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
        >
          Spara substanskort
        </button>
      </form>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Evidenskort</h2>
        {substance.evidence.map((record) => (
          <form
            key={record.id}
            method="post"
            action={`/api/admin/evidence/${record.id}`}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <input type="hidden" name="substanceSlug" value={substance.slug} />
            <p className="text-sm font-semibold text-zinc-900">{record.id}</p>

            <label className="block text-sm font-medium text-zinc-700">Indikation</label>
            <input
              name="indication"
              defaultValue={record.indication}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              required
            />

            <label className="block text-sm font-medium text-zinc-700">Effektstorlek</label>
            <textarea
              name="effectSize"
              defaultValue={record.effectSize}
              className="min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2"
              required
            />

            <label className="block text-sm font-medium text-zinc-700">Kvalitet</label>
            <select
              name="quality"
              defaultValue={record.quality}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="high">Hög</option>
              <option value="moderate">Måttlig</option>
              <option value="low">Låg</option>
              <option value="very_low">Mycket låg</option>
            </select>

            <label className="block text-sm font-medium text-zinc-700">Källa</label>
            <select
              name="sourceId"
              defaultValue={record.sourceId}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title} ({source.year})
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-zinc-700">Senast granskad</label>
            <input
              name="lastReviewedAt"
              type="date"
              defaultValue={record.lastReviewedAt}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              required
            />

            <label className="block text-sm font-medium text-zinc-700">Osäkerhetsnotering</label>
            <textarea
              name="confidenceNotes"
              defaultValue={record.confidenceNotes}
              className="min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2"
              required
            />

            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
            >
              Spara evidenskort
            </button>
          </form>
        ))}
      </section>
    </main>
  );
}
