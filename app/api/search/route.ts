import { searchSubstances } from "@/lib/evidence";
import { searchQuerySchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results = (await searchSubstances(parsed.data.q)).map((substance) => ({
    id: substance.id,
    slug: substance.slug,
    name: substance.name,
    category: substance.category,
    summaryPublic: substance.summaryPublic,
    summaryClinical: substance.summaryClinical,
    synonyms: substance.synonyms,
  }));

  return Response.json({
    query: parsed.data.q,
    total: results.length,
    results,
  });
}
