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
    <main className="mx-auto w-full max-w-5xl p-6 md:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sök evidens</h1>
        <Link className="text-sm underline" href="/">
          Till startsidan
        </Link>
      </div>

      <div className="mt-6">
        <SearchForm initialQuery={query} audience={audience} />
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        {results.length} träffar för sökningen &quot;{query || "alla ämnen"}&quot;
      </p>

      <section className="mt-6 space-y-3">
        {results.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {item.name}
            </h2>
            <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
              {audience === "clinical" ? item.summaryClinical : item.summaryPublic}
            </p>
            <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
              Synonymer: {item.synonyms.join(", ")}
            </p>
            <Link
              className="mt-3 inline-block text-sm font-medium text-sky-900 underline dark:text-sky-300"
              href={`/substances/${item.slug}?audience=${audience}`}
            >
              Öppna faktablad
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
