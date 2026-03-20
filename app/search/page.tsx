import Link from "next/link";

import { searchSubstances } from "@/lib/evidence";
import SearchForm from "@/app/components/SearchForm";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; audience?: "public" | "clinical" }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const audience = params.audience === "clinical" ? "clinical" : "public";
  const results = await searchSubstances(query);

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="flex items-center justify-between">
        <Link className="text-sm font-medium text-emerald-700 hover:text-emerald-800" href="/">
          ← Till startsidan
        </Link>
      </div>

      <h1 className="mt-8 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
        Sök evidens
      </h1>

      <div className="mt-6">
        <label htmlFor="search-results" className="mb-2 block text-sm font-medium text-zinc-700">
          Sök näringsämne eller kosttillskott
        </label>
        <SearchForm initialQuery={query} audience={audience} id="search-results" />
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        {results.length} träffar för sökningen &quot;{query || "alla ämnen"}&quot;
      </p>

      <section className="mt-8 space-y-4">
        {results.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              {item.name}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {audience === "clinical" ? item.summaryClinical : item.summaryPublic}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Synonymer: {item.synonyms.join(", ")}
            </p>
            <Link
              className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
              href={`/substances/${item.slug}?audience=${audience}`}
            >
              Öppna faktablad →
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
