---
name: frontend-testing
description: Generate Vitest + React Testing Library tests for pryt-voice components, hooks, and stores. Triggers on testing, spec files, coverage, Vitest, RTL, unit tests, integration tests, or write/review test requests.
---

# pryt-voice Frontend Testing Skill

This skill enables Claude to generate high-quality, comprehensive frontend tests for the pryt-voice project following established conventions and best practices.

## When to Apply This Skill

Apply this skill when the user:

- Asks to **write tests** for a component, hook, or store
- Asks to **review existing tests** for completeness
- Mentions **Vitest**, **React Testing Library**, **RTL**, or **test files**
- Requests **test coverage** improvement
- Mentions **testing**, **unit tests**, or **integration tests** for frontend code
- Wants to understand **testing patterns** in the codebase

**Do NOT apply** when:

- User is asking about Rust/backend tests
- User is asking about E2E tests
- User is only asking conceptual questions without code context

## Quick Reference

### Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.x | Test runner (browser mode) |
| vitest-browser-react | 2.x | Component/hook rendering in browser |
| Playwright | - | Browser provider (Chromium) |
| TypeScript | 5.x | Type safety |

> **No jsdom.** All tests run in a real Chromium browser via `@vitest/browser` + Playwright.

### Key Commands

```bash
# Run all tests (one-shot)
bun run test --run

# Watch mode
bun run test

# Run specific file
bun run test --run src/path/to/file.test.ts

# Open UI
bun run test:ui
```

### File Naming & Location

- Test files live in `__tests__/` subdirectory next to the source file
- Component tests: `src/components/Foo/__tests__/Foo.test.tsx`
- Hook tests: `src/hooks/__tests__/useHook.test.ts`
- Store tests: `src/stores/__tests__/useStore.test.ts`
- File extension: `.test.ts` / `.test.tsx` (not `.spec`)

## Test Structure Templates

### Component Test

```typescript
import { render } from 'vitest-browser-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MyComponent } from '../MyComponent'
import s from '../MyComponent.module.scss'

// Mock Tauri APIs — always required since they don't exist in browser test env
vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
   writeText: vi.fn().mockResolvedValue(undefined),
}))

describe('MyComponent', () => {
   beforeEach(() => vi.useFakeTimers())
   afterEach(() => vi.useRealTimers())

   it('renders the content', async () => {
      const screen = await render(<MyComponent text="Hello" />)
      await expect.element(screen.getByText('Hello')).toBeVisible()
   })

   it('applies active class after clicking', async () => {
      const screen = await render(<MyComponent text="Click me" />)
      await screen.getByRole('button').click()
      await expect.element(screen.getByRole('button')).toHaveClass(s.active)
   })

   it('resets after 1500ms', async () => {
      const screen = await render(<MyComponent text="Timer test" />)
      await screen.getByRole('button').click()

      await vi.advanceTimersByTimeAsync(1500)
      await expect.element(screen.getByRole('button')).not.toHaveClass(s.active)
   })
})
```

### Hook Test

```typescript
import { renderHook } from 'vitest-browser-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMyHook } from '../useMyHook'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

const { invoke } = await import('@tauri-apps/api/core')
const mockInvoke = vi.mocked(invoke)

describe('useMyHook', () => {
   beforeEach(() => {
      vi.useFakeTimers()
      mockInvoke.mockReset()
   })
   afterEach(() => vi.useRealTimers())

   it('starts with default state', async () => {
      const { result } = await renderHook(() => useMyHook())
      expect(result.current.value).toBe(false)
   })

   it('updates state on action', async () => {
      mockInvoke.mockResolvedValue('ok')
      const { result, act } = await renderHook(() => useMyHook())
      await act(async () => {
         await result.current.doSomething()
      })
      expect(result.current.value).toBe(true)
   })
})
```

### Zustand Store Test

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { initialDataState, useAppStore } from '../useAppStore'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

const { invoke } = await import('@tauri-apps/api/core')
const mockInvoke = vi.mocked(invoke)

describe('useAppStore', () => {
   beforeEach(() => {
      useAppStore.setState(initialDataState)  // reset data, preserve action fns
      mockInvoke.mockReset()
   })

   it('adds a group on success', async () => {
      mockInvoke.mockResolvedValue([{ start: '00:00:00.000', end: '00:00:01.000', text: 'Hello' }])
      await useAppStore.getState().transcribe(new Float32Array([0.1]))
      expect(useAppStore.getState().groups).toHaveLength(1)
   })

   it('sets errorMessage on failure', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('not found'))
      await useAppStore.getState().transcribe(new Float32Array([0.1])).catch(() => {})
      expect(useAppStore.getState().errorMessage).toBe('not found')
   })
})
```

> Store tests need **no `renderHook`/`act`** — call `getState()` actions directly and assert `getState()` after.
> Export `initialDataState` (data fields only, no fns) from the store for clean resets.

## Testing Workflow (CRITICAL)

### ⚠️ Incremental Approach Required

**NEVER generate all test files at once.** For multiple files:

1. **Analyze & Plan**: List all files, order by complexity (simple → complex)
2. **Process ONE at a time**: Write test → Run test → Fix if needed → Next
3. **Verify before proceeding**: Do NOT continue to next file until current passes

```
For each file:
  ┌────────────────────────────────────────────────────────┐
  │ 1. Write test                                          │
  │ 2. Run: bun run test --run src/path/file.test.ts       │
  │ 3. PASS? → Mark complete, next file                    │
  │    FAIL? → Fix first, then continue                    │
  └────────────────────────────────────────────────────────┘
```

### Complexity-Based Order

1. 🟢 Store tests (no rendering, fastest)
2. 🟢 Utility functions
3. 🟢 Custom hooks
4. 🟡 Simple components (presentational)
5. 🟡 Components with state/effects
6. 🔴 Components with Tauri IPC calls

## Core Principles

### 1. AAA Pattern (Arrange-Act-Assert)

Every test should clearly separate:

- **Arrange**: Setup mocks and render
- **Act**: Perform user actions or call store actions
- **Assert**: Verify expected outcomes

### 2. Black-Box Testing

- Test observable behavior, not implementation details
- Use semantic queries (`getByRole`, `getByText`, `getByTitle`)
- Avoid testing internal state directly (except in store tests)

### 3. Single Behavior Per Test

Each test verifies ONE observable behavior.

### 4. Semantic Naming

Use `<behavior> <condition>` (no "should" prefix — project style):

```typescript
it('adds a group when transcription returns segments')
it('sets errorMessage on failure')
it('loses copied class after 1500ms')
```

## Mocking Rules

### Always Mock

- `@tauri-apps/api/core` — `invoke` doesn't exist outside Tauri shell
- `@tauri-apps/plugin-clipboard-manager` — `writeText` doesn't exist outside Tauri

### Mock Pattern

```typescript
vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn(),
}))

// Top-level await to get typed mock reference
const { invoke } = await import('@tauri-apps/api/core')
const mockInvoke = vi.mocked(invoke)
```

### Zustand Store in Component Tests

Use `useAppStore.setState(...)` to set up store state before rendering:

```typescript
beforeEach(() => useAppStore.setState(initialDataState))

it('shows ready status', async () => {
   useAppStore.setState({ statusText: 'Ready', statusType: 'idle' })
   const screen = await render(<StatusBar />)
   await expect.element(screen.getByText('Ready')).toBeVisible()
})
```

## Required Test Scenarios

### Always Required

1. **Rendering**: Component renders without crashing
2. **Props/State**: Key props and initial state values
3. **Edge Cases**: empty arrays, null/undefined, boundary conditions

### Conditional (When Present)

| Feature | Test Focus |
|---------|-----------|
| `useState` | Initial value, transitions |
| Timer (`setTimeout`) | Use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` |
| `invoke` calls | Called with correct args, success path, error path |
| CSS modules | Class applied/removed on state change |
| Clipboard | `writeText` called with correct value |

## Project Configuration

- `vitest.config.ts` — Vitest config (browser mode, Playwright, path aliases)
- `src/stores/useAppStore.ts` — Zustand store (export `initialDataState` for test resets)
- Path alias: `@/` → `src/`
