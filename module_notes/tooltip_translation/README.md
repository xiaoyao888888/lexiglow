# Tooltip Translation Notes

Scope:
- hover word tooltip and selection-translation card behavior in `src/content/index.ts`
- word and selection translation request routing in `src/background/index.ts`
- translation parsing, contextual part-of-speech, and request timeout behavior in `src/shared/translator.ts`
- English token extraction and hyphenated-word handling in `src/shared/word.ts`

Entry points:
- [01_current_flow.md](./01_current_flow.md): current runtime flow, commands, and verification
- [02_handover.md](./02_handover.md): durable current state, validated behavior, and next-step guidance
