import type { ThemeId } from './types'

export function applyTheme(theme: ThemeId) {
   if (theme === 'default') {
      delete document.documentElement.dataset.theme
   } else {
      document.documentElement.dataset.theme = theme
   }
}
