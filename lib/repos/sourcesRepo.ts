import { sources as seedSources } from "@/data/seed";
import type { EvidenceSource } from "@/lib/types";
import { getDbPool } from "@/lib/db";

export async function listSources(): Promise<EvidenceSource[]> {
  const pool = getDbPool();
  if (!pool) return seedSources;

  const res = await pool.query<{
    id: string;
    type: EvidenceSource["type"];
    title: string;
    url: string;
    journalOrPublisher: string;
    year: number;
  }>(
    `
      select
        id,
        source_type as "type",
        title,
        url,
        journal_or_publisher as "journalOrPublisher",
        publication_year as year
      from evidence_sources
      order by publication_year desc, title asc
    `,
  );

  return res.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url,
    journalOrPublisher: row.journalOrPublisher,
    year: row.year,
  }));
}

export async function getSourceById(
  sourceId: string,
): Promise<EvidenceSource | undefined> {
  const pool = getDbPool();
  if (!pool) return seedSources.find((s) => s.id === sourceId);

  const res = await pool.query<{
    id: string;
    type: EvidenceSource["type"];
    title: string;
    url: string;
    journalOrPublisher: string;
    year: number;
  }>(
    `
      select
        id,
        source_type as "type",
        title,
        url,
        journal_or_publisher as "journalOrPublisher",
        publication_year as year
      from evidence_sources
      where id = $1
    `,
    [sourceId],
  );

  const row = res.rows[0];
  if (!row) return undefined;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    url: row.url,
    journalOrPublisher: row.journalOrPublisher,
    year: row.year,
  };
}

