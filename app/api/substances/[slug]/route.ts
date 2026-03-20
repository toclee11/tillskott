import { getSourceById, getSubstanceBySlug } from "@/lib/evidence";
import { audienceSchema } from "@/lib/schemas";
import {
  isMandatoryTrustedSourceType,
  isOptionalTrustedSourceType,
} from "@/lib/trusted-sources";
import { z } from "zod";

const includeSystematicSchema = z
  .enum(["0", "1", "true", "false"])
  .default("0");

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const substance = await getSubstanceBySlug(slug);
  if (!substance) {
    return Response.json({ error: "Substance not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const parsedAudience = audienceSchema.safeParse(
    searchParams.get("audience") ?? "public",
  );
  if (!parsedAudience.success) {
    return Response.json({ error: "Invalid audience mode" }, { status: 400 });
  }

  const summary =
    parsedAudience.data === "clinical"
      ? substance.summaryClinical
      : substance.summaryPublic;

  const parsedIncludeSystematic = includeSystematicSchema.safeParse(
    searchParams.get("includeSystematic") ?? "0",
  );

  const includeSystematic =
    parsedIncludeSystematic.success &&
    (parsedIncludeSystematic.data === "1" ||
      parsedIncludeSystematic.data === "true");

  const evidence = (
    await Promise.all(
      substance.evidence.map(async (record) => ({
        ...record,
        source: (await getSourceById(record.sourceId)) ?? null,
      })),
    )
  ).filter((record) => {
    if (!record.source) return false;
    if (includeSystematic) {
      return (
        isMandatoryTrustedSourceType(record.source.type) ||
        isOptionalTrustedSourceType(record.source.type)
      );
    }

    return isMandatoryTrustedSourceType(record.source.type);
  });

  return Response.json({
    ...substance,
    summary,
    audience: parsedAudience.data,
    evidence,
  });
}
