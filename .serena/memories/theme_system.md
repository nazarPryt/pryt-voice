# Theme System

## Architecture
- CSS variables defined in `src/styles.scss` under `:root` (default) and `[data-theme="v1/v2/v3"]` blocks
- Theme applied to `document.documentElement.dataset.theme` in `App.tsx` via `useEffect`
- Theme state in `useAppStore` (`theme: ThemeId`, `setTheme()`) persisted to `localStorage`
- Theme picker UI in `src/components/SettingsTab/SettingsTab.tsx`
- Type + constants: `ThemeId`, `THEMES` exported from `src/shared/storageKeys.ts`

## Themes
- `default` — Deep purple dark (#7c3aed accent)
- `v1` — CRT Amber (#d98f2a accent, Azeret Mono font, sharp rectangles)
- `v2` — Editorial (#e8543a accent, Playfair Display logo/btn, DM Sans body)
- `v3` — Bauhaus (#d62828 accent, Bebas Neue font, IBM Plex Sans body, light borders on dark bg)

## CSS Variable Categories
- Colors: `--color-*` (all themes)
- RGB triplets: `--color-*-rgb` (for rgba())
- Typography: `--font-body`
- Sidebar: `--sidebar-width`, `--sidebar-padding`, `--sidebar-bg`, `--sidebar-border-right`
- Logo: `--logo-*` (font-family, size, weight, color, letter-spacing, text-transform, border-bottom)
- Nav: `--nav-*`, `--nav-item-*`, `--nav-active-*`
- RecordButton: `--btn-*` (width, height, border-radius, font, color, dot-display, label-display, after-display)
- Transcript area/block: `--transcript-*`, `--block-*`
- Controls/overview layout: `--overview-*`, `--controls-*`
- MicSelect: `--mic-wrapper-*`
- Status bar: `--status-*`
- Generic: `--select-border-radius`, `--item-border-radius`, `--item-bg`, `--settings-list-*`

## RecordButton
- Always renders `<span className={s.dot} />` and `<span className={s.label}>` as children
- Default theme: both spans hidden (display: none), circle shown via `::after`
- Non-default themes: label shown (+ dot for v1), `::after` hidden

## Widget theme sync
- Widget is a separate WebView but shares `localStorage` (same origin) with the main window
- `widget.tsx` imports `styles.scss` to load all CSS custom properties and `[data-theme]` overrides
- On mount, `Widget.tsx` reads `localStorage.getItem('theme')` and applies it to `document.documentElement.dataset.theme`
- `useAppStore.setTheme` calls `emit('theme-changed', theme)` (from `@tauri-apps/api/event`)
- `Widget.tsx` listens to `theme-changed` event for live updates without reload

## Known limitations
- Google Fonts (Azeret Mono, DM Sans, Playfair Display, IBM Plex Sans, Bebas Neue) require internet
