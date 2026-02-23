import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { TranscriptBlock } from '../TranscriptBlock'

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

   it('does not have copied state before clicking', async () => {
      const screen = await render(<TranscriptBlock text="Some text" />)
      await expect.element(screen.getByTestId('transcript-block')).not.toHaveAttribute('data-copied', 'true')
   })

   it('gains copied state after clicking', async () => {
      const screen = await render(<TranscriptBlock text="Click me" />)
      await screen.getByTestId('transcript-block').click()
      await expect.element(screen.getByTestId('transcript-block')).toHaveAttribute('data-copied', 'true')
   })

   it('loses copied state after 1500ms', async () => {
      const screen = await render(<TranscriptBlock text="Timeout test" />)
      await screen.getByTestId('transcript-block').click()

      await vi.advanceTimersByTimeAsync(1500)
      await expect.element(screen.getByTestId('transcript-block')).not.toHaveAttribute('data-copied', 'true')
   })
})
