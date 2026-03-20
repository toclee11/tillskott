import { getSubstances } from "@/lib/evidence";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const substances = await getSubstances();

  const candidates = new Map<string, { label: string; value: string; score: number }>();

  const addCandidate = (label: string) => {
    const value = label;
    const normalized = label.toLowerCase();

    let score = 0;
    if (!q) {
      score = 1;
    } else if (normalized === q) {
      score = 100;
    } else if (normalized.startsWith(q)) {
      score = 50;
    } else if (normalized.includes(q)) {
      score = 10;
    } else {
      score = -1;
    }

    if (score < 0) return;
    const existing = candidates.get(value);
    if (!existing || score > existing.score) {
      candidates.set(value, { label, value, score });
    }
  };

  for (const substance of substances) {
    addCandidate(substance.name);
    for (const syn of substance.synonyms) {
      addCandidate(syn);
    }
  }

  const list = [...candidates.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 8);

  return Response.json({ query: q, suggestions: list });
}

