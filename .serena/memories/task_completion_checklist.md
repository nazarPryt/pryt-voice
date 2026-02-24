# Task Completion Checklist: pryt-voice

When finishing a coding task, do the following as appropriate:

## Always
- [ ] TypeScript compiles without errors (strict mode — no unused vars/params)
- [ ] Prettier formatting applied: `bun run format`
- [ ] No `console.log` left in production code

## When changing SCSS
- [ ] Stylelint passes: `bun run fix:css`
- [ ] Property order follows `stylelint-config-clean-order`

## When changing components/hooks/stores
- [ ] Existing tests still pass: `bun run test`
- [ ] New logic has test coverage in `__tests__/` subfolder

## When changing Rust
- [ ] `cargo check` or `cargo build` passes
- [ ] Dev vs prod path detection uses `cfg!(debug_assertions)`
- [ ] `tauri::Manager` imported if using `app.path()` or window management

## When adding dependencies
- [ ] Use `bun add` (never npm/yarn)
- [ ] Tauri capabilities updated if new plugin used (`src-tauri/capabilities/`)

## Before committing
- [ ] `bun run format` run
- [ ] Conventional commit message (no `Co-Authored-By` trailer)
