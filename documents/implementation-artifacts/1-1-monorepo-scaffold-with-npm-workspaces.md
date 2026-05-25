# Story 1.1: Monorepo Scaffold with npm Workspaces

Status: done

## Story

As a **developer (Jarvis)**,
I want to initialize the monorepo with npm workspaces, linting, formatting, and commit hooks,
so that all subsequent stories have a consistent, enforced code quality foundation from day one.

## Acceptance Criteria

1. `package.json` root declares workspaces `["apps/*", "packages/*"]`.
2. `npm install` from root resolves all workspace deps without errors.
3. `tsconfig.base.json` with `strict: true` exists; each app/package extends it.
4. Husky `pre-commit` hook runs lint + typecheck on staged files.
5. Husky `commit-msg` hook enforces conventional commit format.
6. Prettier config applied; `npm run format:check` passes on empty project.
7. ESLint flat config with rule banning `any` in `apps/api/src/**/services/**`.

## Tasks / Subtasks

- [x] Task 1: Initialize root package.json with workspaces (AC: #1, #2)
  - [x] Create root `package.json` with `"workspaces": ["apps/*", "packages/*"]`
  - [x] Create placeholder `apps/api/package.json` (NestJS — empty for now)
  - [x] Create placeholder `apps/web/package.json` (Next.js — empty for now)
  - [x] Create placeholder `packages/shared-types/package.json`
  - [x] Run `npm install` and verify no errors
- [x] Task 2: TypeScript base config (AC: #3)
  - [x] Create `tsconfig.base.json` at root with `strict: true`, `esModuleInterop`, `skipLibCheck`, path aliases
  - [x] Create `apps/api/tsconfig.json` extending `../../tsconfig.base.json`
  - [x] Create `apps/web/tsconfig.json` extending `../../tsconfig.base.json`
  - [x] Create `packages/shared-types/tsconfig.json` extending `../../tsconfig.base.json`
- [x] Task 3: ESLint flat config (AC: #7)
  - [x] Install `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
  - [x] Create `eslint.config.mjs` (flat config format) at root
  - [x] Add rule: `@typescript-eslint/no-explicit-any` = error for `apps/api/src/**/services/**`
  - [x] Add rule: `no-console` = error for production code
  - [x] Add `npm run lint` script to root
- [x] Task 4: Prettier config (AC: #6)
  - [x] Install `prettier`
  - [x] Create `.prettierrc` (singleQuote, semi, trailingComma, printWidth: 100)
  - [x] Create `.prettierignore` (node_modules, dist, .next, coverage)
  - [x] Add `npm run format:check` and `npm run format` scripts
- [x] Task 5: Husky + commitlint + lint-staged (AC: #4, #5)
  - [x] Install `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`
  - [x] Create `.commitlintrc.cjs` extending `@commitlint/config-conventional`
  - [x] Create `.lintstagedrc.json` running eslint + prettier on staged TS/TSX files
  - [x] Run `npx husky init`
  - [x] Create `.husky/pre-commit` → `npx lint-staged`
  - [x] Create `.husky/commit-msg` → `npx --no -- commitlint --edit $1`
  - [x] Verify: bad commit message → rejected; good message → passes
- [x] Task 6: Verify end-to-end (AC: #1–#7)
  - [x] `npm install` clean from root → success
  - [x] `npm run lint` → passes (no files to lint yet, no errors)
  - [x] `npm run format:check` → passes
  - [x] Commit with bad message → rejected by commitlint
  - [x] Commit with `feat: initial scaffold` → accepted

## Dev Notes

### Architecture Compliance

- **Workspace tool**: npm workspaces (brief §4.2, user preference over pnpm/yarn).
- **Module system**: ESM for config files (`.mjs`), TypeScript for source.
- **Node version**: Not pinned in engines yet (will be added with Docker in Story 1.3).
- **Monorepo structure** per architecture §3.2:

```
prodigy-glasses-remake/
├── apps/
│   ├── api/          # NestJS (Story 1.2 will bootstrap)
│   └── web/          # Next.js (Story 1.5 will bootstrap)
├── packages/
│   └── shared-types/ # Zod schemas + TS types (Story 1.6 will populate)
├── package.json      # workspaces root
├── tsconfig.base.json
├── eslint.config.mjs
├── .prettierrc
├── .commitlintrc.cjs
├── .husky/
└── .lintstagedrc.json
```

### Technical Requirements

- **ESLint**: Use flat config format (`eslint.config.mjs`), NOT legacy `.eslintrc`. ESLint 9+ required.
- **TypeScript**: `strict: true` is non-negotiable (NFR-05 AC6).
- **Prettier**: Must NOT conflict with ESLint — use `eslint-config-prettier` to disable formatting rules in ESLint.
- **Commitlint**: Conventional commits format enforced (NFR-06 AC1). Format: `type(scope): message`.
- **lint-staged**: Only lint staged files (not entire repo) for pre-commit speed.

### Anti-Patterns to Avoid

- ❌ Do NOT use `.eslintrc.js` or `.eslintrc.json` — legacy format. Use `eslint.config.mjs` (flat config).
- ❌ Do NOT install `@eslint/eslintrc` compatibility layer — write native flat config.
- ❌ Do NOT add `engines` field yet — Docker will pin Node version in Story 1.3.
- ❌ Do NOT add any source code (controllers, services) — this story is scaffold only.
- ❌ Do NOT use `prettier-eslint` — use `eslint-config-prettier` (disable ESLint formatting rules).
- ❌ Do NOT use `tslint` — deprecated, ESLint with TS plugin only.

### Library Versions (pin exact)

| Package                          | Version | Notes                     |
| -------------------------------- | ------- | ------------------------- |
| typescript                       | ~5.5.x  | Latest stable             |
| eslint                           | ^9.x    | Flat config required      |
| @typescript-eslint/eslint-plugin | ^8.x    | Matches ESLint 9          |
| @typescript-eslint/parser        | ^8.x    | Matches above             |
| eslint-config-prettier           | ^10.x   | Disables formatting rules |
| prettier                         | ^3.x    | Latest stable             |
| husky                            | ^9.x    | Modern init flow          |
| lint-staged                      | ^15.x   | Latest                    |
| @commitlint/cli                  | ^19.x   | Latest                    |
| @commitlint/config-conventional  | ^19.x   | Matches CLI               |

### Project Structure Notes

- Root `package.json` must have `"private": true` (npm workspaces requirement).
- Each workspace package needs its own `package.json` with `"name": "@prodigy/<name>"` scope.
- `packages/shared-types` name: `@prodigy/shared-types`.
- `apps/api` name: `@prodigy/api`.
- `apps/web` name: `@prodigy/web`.

### tsconfig.base.json Shape

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"]
  },
  "exclude": ["node_modules", "dist", ".next"]
}
```

### ESLint Flat Config Shape

```javascript
// eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['apps/api/src/**/services/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/coverage/**'],
  },
);
```

### References

- [Source: architecture.md §3.2 — Repository structure]
- [Source: architecture.md §2.3 — Constraints: npm workspaces]
- [Source: brief.md §4.2 — Repository structure proposed]
- [Source: PRD NFR-05 AC6 — TypeScript strict, 0 any in services]
- [Source: PRD NFR-05 AC7 — ESLint --max-warnings 0]
- [Source: PRD NFR-05 AC8 — No console.log in production]
- [Source: PRD NFR-06 AC1 — Conventional commits]
- [Source: PRD NFR-06 AC6 — Husky pre-commit hook]
- [Source: PRD NFR-06 AC7 — Prettier auto-format]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- All 6 tasks completed successfully in single session
- npm workspaces configured with 3 packages (@prodigy/api, @prodigy/web, @prodigy/shared-types)
- ESLint 9 flat config with typescript-eslint, no-console rule, no-explicit-any for services
- Prettier 3 with singleQuote, semi, trailingComma, printWidth 100
- Husky 9 with pre-commit (lint-staged) and commit-msg (commitlint) hooks
- TypeScript strict mode enabled in base config; each workspace extends it
- All verification commands pass: lint, format:check, typecheck, commitlint

### File List

- package.json (NEW)
- package-lock.json (NEW)
- tsconfig.base.json (NEW)
- eslint.config.mjs (NEW)
- .prettierrc (NEW)
- .prettierignore (NEW)
- .commitlintrc.cjs (NEW)
- .lintstagedrc.json (NEW)
- .husky/pre-commit (NEW)
- .husky/commit-msg (NEW)
- .gitignore (MODIFIED)
- apps/api/package.json (NEW)
- apps/api/tsconfig.json (NEW)
- apps/web/package.json (NEW)
- apps/web/tsconfig.json (NEW)
- packages/shared-types/package.json (NEW)
- packages/shared-types/tsconfig.json (NEW)
- packages/shared-types/src/index.ts (NEW)
