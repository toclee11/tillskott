# Evidensdriven kosttillskotts-sajt

Webbapp för sökbar, evidensbaserad medicinsk information om vitaminer, mineraler och kosttillskott.
Varje faktapunkt är kopplad till evidenskällor med prioritet: Cochrane, SBU, PubMed
meta-analyser/systematiska översikter och sedan RCT vid evidensluckor.

## Funktioner
- Söksida och faktablad per substans.
- Två visningslägen: `allmänhet` och `fördjupning`.
- API-rutter för sök, substansdata och granskningskö.
- Ingestion-pipeline med deduplicering och rangordning.
- Redaktionellt granskningsflöde med publiceringsregler.
- Testsvit för sök/ranking/pipeline.

## Snabbstart
```bash
npm install
npm run dev
```

## Viktiga scripts
```bash
npm run test
npm run ingest
npm run lint
```

## Arkitektur
- Frontend: Next.js App Router.
- Domänlogik: `lib/evidence.ts`, `lib/pipeline.ts`.
- Seeddata: `data/seed.ts`.
- API:
  - `GET /api/search?q=...`
  - `GET /api/substances/[slug]?audience=public|clinical`
  - `GET /api/review/queue`
  - `POST /api/review/submit`
  - `POST /api/review/update-status`
- Governance:
  - `docs/publishing-policy.md`
  - `docs/evidence-schema.sql`

## Medicinsk disclaimer
Innehållet är endast informationsmaterial och ersätter inte individuell medicinsk
bedömning av legitimerad hälso- och sjukvårdspersonal.
