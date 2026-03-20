# Publishing and governance policy

## Scope
- Applies to all content covering vitamins, minerals and dietary supplements.
- Every factual claim must map to at least one source in the source registry.

## Source hierarchy
1. Cochrane reviews
2. SBU reports
3. PubMed meta-analyses/systematic reviews
4. RCT evidence when higher-tier evidence is missing

## Publication gates
- New or changed evidence starts in `pending`.
- A reviewer must set status `approved` before public display.
- `rejected` entries remain in history with reviewer rationale.

## Versioning
- Any approved evidence change creates a `change_log` record with:
  - entity type and id
  - reviewer identity
  - timestamp
  - justification and payload snapshot

## Safety requirements
- Public pages must display medical disclaimer text.
- Conflicting evidence must be labeled clearly as uncertain.
- Outdated entries (older than 12 months without review) should trigger warnings.
