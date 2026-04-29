# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the extension code split by runtime: `background/`, `content/`, `popup/`, `options/`, and shared helpers in `shared/`. Generated lexicon data lives in `src/generated/lexicon.ts`; rebuild it instead of editing it by hand. Static extension metadata is in `public/manifest.json`, visual assets are in `assets/`, source word lists are in `data/`, automation scripts are in `scripts/`, and Vitest coverage lives in `tests/`. Build output goes to `dist/` and should stay generated.

Module-specific operational notes and current-status documentation should live under `module_notes/`, not in this file.

## Build, Test, and Development Commands
Run `npm install` once to install the TypeScript, Vite, esbuild, and Vitest toolchain.

- `npm run fetch:lexicon`: downloads `data/google-10000-english.txt`.
- `npm run build`: regenerates `src/generated/lexicon.ts`, builds popup/options/background with Vite, and bundles `src/content/index.ts` with esbuild into `dist/`.
- `npm run dev`: currently runs the same pipeline as `build`; it is not a watch server.
- `npm test`: runs all `tests/**/*.test.ts` files with Vitest.
- `npx tsc --noEmit`: useful pre-PR type check against the strict TS config.

Load the unpacked extension from the repo root or `dist/` in `chrome://extensions`.

## Coding Style & Naming Conventions
Match the existing TypeScript style: 2-space indentation, double quotes, semicolons, and small focused modules. Keep shared utilities in `src/shared/`, and use feature entrypoints named `index.ts` inside runtime folders such as `src/content/index.ts`. Use descriptive camelCase for variables and functions, and PascalCase only for types or interfaces. There is no repo-local ESLint or Prettier config, so keep diffs surgical and consistent with nearby files.

## Testing Guidelines
Write Vitest unit tests in `tests/` and name them `*.test.ts`, following the existing pattern like `tests/normalize.test.ts`. Add or update tests whenever you change parsing, settings, translation, pronunciation, or lexicon behavior. Prefer focused assertions over broad integration scaffolding, and run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
Recent commits use short imperative subjects such as `Stabilize sentence analysis pipeline` and `Improve pronunciation UX and audio handling`. Keep commits narrowly scoped and explain user-visible behavior in the first line. PRs should include a concise summary, linked issue when applicable, test notes, and screenshots or short recordings for popup, options, or tooltip UI changes. Call out any `manifest.json` permission changes and any regenerated lexicon data explicitly.
