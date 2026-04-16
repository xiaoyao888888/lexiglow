# Sentence Analysis Notes

Scope:
- selection-translation to long-sentence-analysis flow driven by `TRANSLATE_SELECTION` and `ANALYZE_SELECTION`
- prompt and parsing behavior in `src/shared/translator.ts`
- clause-block display logic in `src/shared/sentenceAnalysisDisplay.ts`
- analysis panel hierarchy, loading copy, and step rendering in `src/content/index.ts`

Entry points:
- [01_current_flow.md](./01_current_flow.md): current runtime flow, commands, and verification
- [02_handover.md](./02_handover.md): durable current state, validated results, and next-step guidance
