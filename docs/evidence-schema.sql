-- PostgreSQL logical schema for evidence-driven supplement knowledge base.

create table if not exists substances (
  id text primary key,
  slug text unique not null,
  name text not null,
  category text not null check (category in ('vitamin', 'mineral', 'supplement')),
  common_dose_range text not null,
  summary_public text not null,
  summary_clinical text not null,
  absorption_process text,
  absorption_source_ids text[],
  distribution_organ_process text,
  distribution_source_ids text[],
  metabolism_process text,
  metabolism_source_ids text[],
  contraindications text[] not null default '{}',
  interactions text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists substance_synonyms (
  substance_id text not null references substances(id) on delete cascade,
  synonym text not null,
  primary key (substance_id, synonym)
);

create table if not exists evidence_sources (
  id text primary key,
  source_type text not null,
  title text not null,
  url text not null,
  journal_or_publisher text not null,
  publication_year int not null
);

create table if not exists evidence_records (
  id text primary key,
  substance_id text not null references substances(id) on delete cascade,
  source_id text not null references evidence_sources(id),
  indication text not null,
  population text not null,
  intervention text not null,
  comparator text not null,
  outcome text not null,
  effect_size text not null,
  adverse_effects text not null,
  confidence_notes text not null,
  quality text not null check (quality in ('high', 'moderate', 'low', 'very_low')),
  last_reviewed_at date not null
);

create table if not exists review_entries (
  id text primary key,
  substance_id text not null references substances(id),
  submitted_by text not null,
  submitted_at timestamptz not null,
  claim text not null,
  rationale text not null,
  source_ids text[] not null default '{}',
  evidence_payload jsonb,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  reviewer_comment text
);

create table if not exists change_log (
  id bigserial primary key,
  entity_type text not null,
  entity_id text not null,
  changed_by text not null,
  changed_at timestamptz not null default now(),
  change_reason text not null,
  payload jsonb not null
);
