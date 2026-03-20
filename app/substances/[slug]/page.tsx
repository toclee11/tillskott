import Link from "next/link";
import { notFound } from "next/navigation";

import { getSourceById, getSourceUrl, getSubstanceBySlug } from "@/lib/evidence";
import {
  categoryToSwedish,
  evidenceQualityToSwedish,
  sourceTypeToSwedish,
} from "@/lib/swedish-labels";
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
    <div className="mt-2 border-t border-zinc-100 pt-2">
      <p className="text-xs font-semibold text-zinc-900">Källhänvisning</p>
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
                className="font-medium text-emerald-700 underline hover:text-emerald-800"
                href={getSourceUrl(src)}
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

  const hasMandatoryEvidence = evidenceWithSources.some(
    ({ source }) => source && isMandatoryTrustedSourceType(source.type),
  );

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
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <header className="space-y-2">
        <Link
          className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
          href={`/search?audience=${audience}`}
        >
          ← Tillbaka till sök
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            {substance.name}
          </h1>
          {!hasMandatoryEvidence && (
            <span
              className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
              title="Ingen evidens från Cochrane, SBU eller meta-analyser"
            >
              Saknar evidens från Cochrane, SBU och meta-analys
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-600">
          {categoryToSwedish(substance.category)} · Vanlig dos:{" "}
          {substance.commonDoseRange}
        </p>
      </header>

      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {audience === "clinical" ? "Klinisk sammanfattning" : "Sammanfattning"}
          </h2>
        </div>
        <div className="p-5">
        <p className="text-sm leading-relaxed text-zinc-700">
          {audience === "clinical"
            ? substance.summaryClinical
            : substance.summaryPublic}
        </p>
        {audience === "clinical" &&
        (substance.absorptionProcess ||
          substance.distributionOrganProcess ||
          substance.metabolismProcess) ? (
          <div className="mt-5 space-y-4 border-t border-zinc-100 pt-4">
            {substance.absorptionProcess ? (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Upptag</h3>
                <p className="mt-1 text-sm text-zinc-700">
                  {substance.absorptionProcess}
                </p>
                <PhysiologySourceCitations
                  sourceIds={substance.absorptionSourceIds}
                />
              </div>
            ) : null}
            {substance.distributionOrganProcess ? (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Verkan i kroppen
                </h3>
                <p className="mt-1 text-sm text-zinc-700">
                  {substance.distributionOrganProcess}
                </p>
                <PhysiologySourceCitations
                  sourceIds={substance.distributionSourceIds}
                />
              </div>
            ) : null}
            {substance.metabolismProcess ? (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Metabolism och clearance
                </h3>
                <p className="mt-1 text-sm text-zinc-700">
                  {substance.metabolismProcess}
                </p>
                <PhysiologySourceCitations
                  sourceIds={substance.metabolismSourceIds}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <h3 className="font-semibold text-zinc-900">Kontraindikationer</h3>
          </div>
          <ul className="list-inside list-disc space-y-1 p-4 text-sm text-zinc-700">
            {substance.contraindications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
            <h3 className="font-semibold text-zinc-900">Interaktioner</h3>
          </div>
          <ul className="list-inside list-disc space-y-1 p-4 text-sm text-zinc-700">
            {substance.interactions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          Evidens och evidenskällor
        </h2>

        {!hasMandatoryEvidence && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">
              Ingen evidens från Cochrane, SBU eller meta-analyser
            </p>
            <p className="mt-1 text-amber-800">
              Det finns för närvarande inga källor från Cochrane-reviews, SBU-rapporter eller PubMed meta-analyser för denna substans. Evidensen kan vara begränsad eller under utveckling.
            </p>
          </div>
        )}

        {hasOptionalSystematic ? (
          <div className="mt-3">
            {!includeSystematic ? (
              <form method="get" action={`/substances/${slug}`}>
                <input type="hidden" name="audience" value={audience} />
                <input type="hidden" name="includeSystematic" value="1" />
                <button
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                  type="submit"
                >
                  Visa systematiska översikter
                </button>
              </form>
            ) : (
              <Link
                className="inline-flex rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                href={`/substances/${slug}?audience=${audience}`}
              >
                Göm systematiska översikter
              </Link>
            )}
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          {filteredEvidence.map(({ record, source }) => (
            <article
              key={record.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {source && (
                    <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      {sourceTypeToSwedish(source.type)}
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    Kvalitet: {evidenceQualityToSwedish(record.quality)} · Senast granskad: {record.lastReviewedAt}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-zinc-900">{record.indication}</p>
              </div>
              <div className="p-4">
              <p className="text-sm text-zinc-700">{record.effectSize}</p>
              <p className="mt-2 text-xs text-zinc-600">
                Osäkerhetsnotering: {record.confidenceNotes}
              </p>
              {audience === "clinical" ? (
                <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
                  <p><span className="font-medium text-zinc-900">Population:</span> {record.population}</p>
                  <p><span className="font-medium text-zinc-900">Intervention:</span> {record.intervention}</p>
                  <p><span className="font-medium text-zinc-900">Jämförelse:</span> {record.comparator}</p>
                  <p><span className="font-medium text-zinc-900">Utfall:</span> {record.outcome}</p>
                  <p><span className="font-medium text-zinc-900">Biverkningar:</span> {record.adverseEffects}</p>
                </div>
              ) : null}
              {source ? (
                <a
                  className="mt-4 inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  href={getSourceUrl(source)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Evidenskälla: {source.title} ({source.year}) ↗
                </a>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">Källreferens saknas</p>
              )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm shadow-sm">
        <p className="font-semibold text-amber-900">Viktig information</p>
        <p className="mt-2 text-amber-800">
          Innehållet är endast för informationssyfte och ersätter inte
          individuell bedömning, diagnos eller behandling av legitimerad hälso- och
          sjukvårdspersonal.
        </p>
      </section>
    </main>
  );
}
