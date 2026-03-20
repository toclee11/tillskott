import Link from "next/link";
import { notFound } from "next/navigation";

import { getSubstanceBySlug, getSourceById } from "@/lib/evidence";
import { categoryToSwedish, evidenceQualityToSwedish } from "@/lib/swedish-labels";
import {
  isMandatoryTrustedSourceType,
  isOptionalTrustedSourceType,
} from "@/lib/trusted-sources";

type SubstancePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    audience?: "public" | "clinical";
    includeSystematic?: string;
  }>;
};

async function PhysiologySourceCitations({
  sourceIds,
}: {
  sourceIds?: string[];
}) {
  if (!sourceIds?.length) return null;

  const sources = await Promise.all(
    sourceIds.map(async (id) => {
      const src = await getSourceById(id);
      return { id, src };
    }),
  );

  return (
    <div className="mt-2 border-t border-zinc-200 pt-2">
      <p className="text-xs font-semibold text-black">Källhänvisning</p>
      <ul className="mt-1 list-inside list-disc text-xs text-zinc-800">
        {sources.map(({ id, src }) => {
          if (!src) {
            return (
              <li key={id} className="text-zinc-600">
                Okänd källa ({id})
              </li>
            );
          }

          return (
            <li key={id}>
              <a
                className="font-medium text-sky-900 underline"
                href={src.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {src.title}
              </a>
              <span className="text-zinc-700">
                {" "}
                ({src.year}
                {src.pubmedId ? `, PubMed ${src.pubmedId}` : ""})
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function SubstancePage({
  params,
  searchParams,
}: SubstancePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const audience =
    resolvedSearchParams.audience === "clinical" ? "clinical" : "public";
  const includeSystematic =
    resolvedSearchParams.includeSystematic === "1" ||
    resolvedSearchParams.includeSystematic === "true";
  const substance = await getSubstanceBySlug(slug);

  if (!substance) {
    notFound();
  }

  const evidenceWithSources = await Promise.all(
    substance.evidence.map(async (record) => ({
      record,
      source: await getSourceById(record.sourceId),
    })),
  );

  const hasOptionalSystematic = evidenceWithSources.some(
    ({ source }) => source && isOptionalTrustedSourceType(source.type),
  );

  const priority = (type: string) => {
    if (type === "pubmed_meta_analysis") return 1;
    if (type === "cochrane_review") return 2;
    if (type === "sbu_report") return 3;
    if (type === "pubmed_systematic_review") return 4;
    return 99;
  };

  const filteredEvidence = evidenceWithSources
    .filter(({ source }) => {
      if (!source) return false;
      if (includeSystematic) {
        return (
          isMandatoryTrustedSourceType(source.type) ||
          isOptionalTrustedSourceType(source.type)
        );
      }
      return isMandatoryTrustedSourceType(source.type);
    })
    .sort((a, b) => {
      const pr = priority(a.source!.type) - priority(b.source!.type);
      return pr || b.source!.year - a.source!.year;
    });

  return (
    <main className="mx-auto w-full max-w-5xl p-6 md:p-10 dark:bg-zinc-950">
      <header className="space-y-2">
        <Link
          className="text-sm text-zinc-700 underline dark:text-zinc-300"
          href={`/search?audience=${audience}`}
        >
          Tillbaka till sök
        </Link>
        <h1 className="text-3xl font-bold text-black dark:text-white">
          {substance.name}
        </h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          {categoryToSwedish(substance.category)} | Vanlig dos:{" "}
          {substance.commonDoseRange}
        </p>
      </header>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-300 dark:bg-white">
        <h2 className="text-lg font-semibold text-black">
          {audience === "clinical" ? "Klinisk sammanfattning" : "Sammanfattning"}
        </h2>
        <p className="mt-2 text-sm text-zinc-800">
          {audience === "clinical"
            ? substance.summaryClinical
            : substance.summaryPublic}
        </p>
        {audience === "clinical" &&
        (substance.absorptionProcess ||
          substance.distributionOrganProcess ||
          substance.metabolismProcess) ? (
          <div className="mt-4 space-y-3">
            {substance.absorptionProcess ? (
              <div>
                <h3 className="text-sm font-semibold text-black">Upptag</h3>
                <p className="mt-1 text-sm text-zinc-800">
                  {substance.absorptionProcess}
                </p>
                <PhysiologySourceCitations
                  sourceIds={substance.absorptionSourceIds}
                />
              </div>
            ) : null}
            {substance.distributionOrganProcess ? (
              <div>
                <h3 className="text-sm font-semibold text-black">
                  Verkan i kroppen
                </h3>
                <p className="mt-1 text-sm text-zinc-800">
                  {substance.distributionOrganProcess}
                </p>
                <PhysiologySourceCitations
                  sourceIds={substance.distributionSourceIds}
                />
              </div>
            ) : null}
            {substance.metabolismProcess ? (
              <div>
                <h3 className="text-sm font-semibold text-black">
                  Metabolism och clearance
                </h3>
                <p className="mt-1 text-sm text-zinc-800">
                  {substance.metabolismProcess}
                </p>
                <PhysiologySourceCitations
                  sourceIds={substance.metabolismSourceIds}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-300 dark:bg-white">
          <h3 className="font-semibold text-black">Kontraindikationer</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-800">
            {substance.contraindications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-300 dark:bg-white">
          <h3 className="font-semibold text-black">Interaktioner</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-800">
            {substance.interactions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold text-black">Evidens och evidenskällor</h2>

        {hasOptionalSystematic ? (
          <div className="mt-3">
            {!includeSystematic ? (
              <form method="get" action={`/substances/${slug}`}>
                <input type="hidden" name="audience" value={audience} />
                <input type="hidden" name="includeSystematic" value="1" />
                <button
                  className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                  type="submit"
                >
                  Visa systematiska översikter
                </button>
              </form>
            ) : (
              <Link
                className="inline-flex rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
                href={`/substances/${slug}?audience=${audience}`}
              >
                Göm systematiska översikter
              </Link>
            )}
          </div>
        ) : null}

        <div className="mt-3 space-y-3">
          {filteredEvidence.map(({ record, source }) => (
            <article
              key={record.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <p className="text-sm font-semibold text-black">{record.indication}</p>
              <p className="mt-1 text-sm text-zinc-800">{record.effectSize}</p>
              <p className="mt-1 text-xs text-zinc-700">
                Kvalitet: {evidenceQualityToSwedish(record.quality)} | Senast
                granskad: {record.lastReviewedAt}
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                Osäkerhetsnotering: {record.confidenceNotes}
              </p>
              {audience === "clinical" ? (
                <div className="mt-3 space-y-1 text-sm text-zinc-800">
                  <p>
                    <span className="font-semibold text-black">Population:</span>{" "}
                    {record.population}
                  </p>
                  <p>
                    <span className="font-semibold text-black">Intervention:</span>{" "}
                    {record.intervention}
                  </p>
                  <p>
                    <span className="font-semibold text-black">Jämförelse:</span>{" "}
                    {record.comparator}
                  </p>
                  <p>
                    <span className="font-semibold text-black">Utfall:</span>{" "}
                    {record.outcome}
                  </p>
                  <p>
                    <span className="font-semibold text-black">Biverkningar:</span>{" "}
                    {record.adverseEffects}
                  </p>
                </div>
              ) : null}
              {source ? (
                <a
                  className="mt-2 inline-block text-sm font-medium text-sky-900 underline"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Evidenskälla: {source.title} ({source.year})
                </a>
              ) : (
                <p className="mt-2 text-sm text-zinc-800">Källreferens saknas</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-300 dark:bg-amber-50">
        <p className="font-semibold text-black">Viktig information</p>
        <p className="mt-1 text-zinc-800">
          Innehållet är endast för informationssyfte och ersätter inte
          individuell bedömning, diagnos eller behandling av legitimerad hälso- och
          sjukvårdspersonal.
        </p>
      </section>
    </main>
  );
}
