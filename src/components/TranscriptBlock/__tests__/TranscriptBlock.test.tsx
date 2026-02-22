import { render } from 'vitest-browser-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TranscriptBlock } from '../TranscriptBlock'
import s from '../TranscriptBlock.module.scss'

vi.mock('@tauri-apps/api/core', () => ({
   invoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
   writeText: vi.fn().mockResolvedValue(undefined),
}))

describe('TranscriptBlock', () => {
   beforeEach(() => vi.useFakeTimers())
   afterEach(() => vi.useRealTimers())

   it('renders the segment text', async () => {
      const screen = await render(<TranscriptBlock text="Hello world" />)
      await expect.element(screen.getByText('Hello world')).toBeVisible()
   })

   it('does not have copied class before clicking', async () => {
      const screen = await render(<TranscriptBlock text="Some text" />)
      await expect.element(screen.getByTitle('Click to copy')).not.toHaveClass(s.copied)
   })

   it('gains copied class after clicking', async () => {
      const screen = await render(<TranscriptBlock text="Click me" />)
      await screen.getByTitle('Click to copy').click()
      await expect.element(screen.getByTitle('Click to copy')).toHaveClass(s.copied)
   })

   it('loses copied class after 1500ms', async () => {
      const screen = await render(<TranscriptBlock text="Timeout test" />)
      await screen.getByTitle('Click to copy').click()

      await vi.advanceTimersByTimeAsync(1500)
      await expect.element(screen.getByTitle('Click to copy')).not.toHaveClass(s.copied)
   })
})