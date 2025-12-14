# Repository Guidelines

## Project Structure & Module Organization

- `cachearena/`: Browser extension source code
  - `background.js`: Manages cache storage and data persistence
  - `content/data-extract.js`: Extracts phone specifications from GSMArena pages
  - `content/data-sync.js`: Legacy compatibility file (not used)
  - `shared/`: Cross-file utilities including `normalize.js`, `config.js`, `dom-utils.js`, `async-utils.js`, and `runtime-utils.js`
  - `manifest.json`: Extension configuration and permissions
- `01_phone-page.html`: Example GSMArena phone page for testing selectors and parsing
- `docs/`: Reference screenshots (if any)
- `build-extension.sh`: Build script that creates `.xpi` (Firefox) and `.zip` (Chrome) packages
- `.pre-commit-config.yaml`: Pre-commit hooks configuration for code quality

## Build, Test, and Development Commands

- The common development environment is NixOS: you have access to all nix and nixpkgs tooling to install and run new tools.
- **Development**: No build step required for development; load `cachearena/manifest.json` directly via `about:debugging#/runtime/this-firefox` for temporary Firefox installs.
- **Build**: Run `npm run build` or `./build-extension.sh` to create production packages (creates `.xpi` and `.zip` files in `build/` directory).
- **Linting**: Run `npm run lint` or `web-ext lint --source-dir cachearena` to check for manifest or permission issues. Use `npm run lint:fix` for automatic fixes.
- **Formatting**: Run `npm run format` to format code with Prettier. Use `npm run format:check` to verify formatting without changes.
- **Live reload**: Run `web-ext run --source-dir cachearena --firefox=nightly` (or your Firefox binary) to iterate on content scripts with automatic reloading.
- **Pre-commit hooks**: Configured via `.pre-commit-config.yaml` to run linting and formatting checks before commits.

## Coding Style & Naming Conventions

- JavaScript is plain ES2020 with IIFEs; prefer `const`/`let`, arrow functions for callbacks, and trailing semicolons. Indent with two spaces.
- Use lower camelCase for variables/functions; keys mirrored from external storage (`gsmarena-phones::records`, etc.) stay verbatim.
- Keep shared helpers in `cachearena/shared/` and reuse exported utilities instead of duplicating normalization, DOM manipulation, or async logic.
- When adding new data fields, update the schema in `background.js` (`normalizeEntry` function) and the extraction logic in `content/data-extract.js`.
- Follow ESLint and Prettier configurations defined in `eslint.config.js` and `.prettierrc`.

## Testing Guidelines

- There is no automated test suite; rely on manual verification. After changes:
  1. Load the extension via `about:debugging#/runtime/this-firefox`
  2. Visit GSMArena phone specification pages to test the cache extraction
  3. Verify data is stored correctly by exporting to CSV or inspecting browser storage
- Use the HTML snapshot in `01_phone-page.html` to check selector robustness without network dependence.
- Run `npm run lint` and `npm run format:check` before submitting to catch code quality issues.
- Pre-commit hooks will automatically run checks; fix any issues they report.

## Commit & Pull Request Guidelines

- Follow the existing log style: short, present-tense summaries (e.g., `add battery extraction field`), ~72 chars. Squash locally if needed; avoid noisy churn.
- For PRs, provide a concise description, linked issues (if any), manual test notes, and screenshots when UI or data output changes. Call out any new permissions or storage keys added.
