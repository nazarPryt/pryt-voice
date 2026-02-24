# Code Style & Conventions: pryt-voice

## TypeScript
- Strict mode enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- Target: ES2020, module: ESNext
- Path alias: `@/` → `src/`
- No type annotations unless needed (inference preferred)

## Prettier (enforced)
- No semicolons (`"semi": false`)
- Single quotes (`"singleQuote": true`)
- Trailing commas everywhere (`"trailingComma": "all"`)
- Tab width: 3 spaces
- Print width: 120
- Arrow parens: omit when single param (`"arrowParens": "avoid"`)
- LF line endings
- Import order plugin: `react` → `react-dom` → third-party → `@/` → relative

## SCSS / CSS
- SCSS Modules per component (`Component.module.scss`)
- Stylelint with `stylelint-config-clean-order` (property order enforced)
- Global styles in `src/styles.scss`
- Radix UI: use `[data-state='active']` / `[data-state='inactive']` selectors

## React Components
- Per-component folder structure: `ComponentName/ComponentName.tsx` + `.module.scss` + `index.ts` (re-export)
- Functional components only
- Props typed inline or with interface
- State centralized in Zustand store (`src/stores/useAppStore.ts`)
- `clsx` for conditional class names

## File Naming
- Components: PascalCase (`RecordButton.tsx`)
- Hooks: camelCase with `use` prefix (`useRecorder.ts`)
- Stores: camelCase with `use` prefix (`useAppStore.ts`)
- SCSS modules: same name as component (`RecordButton.module.scss`)
- Tests: `__tests__/` subfolder, `.test.ts` / `.test.tsx` suffix

## Rust
- snake_case for all identifiers
- Tauri commands: snake_case in Rust automatically maps to camelCase in JS
- Dev vs prod path detection: `cfg!(debug_assertions)`
- Import `tauri::Manager` when using `app.path()` or `get_webview_window()`

## Commit Messages
- Conventional commits style (`feat:`, `fix:`, `refactor:`, `chore:`, etc.)
- Do NOT add `Co-Authored-By` trailer
