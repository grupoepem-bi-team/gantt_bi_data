import { ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

const currentTheme = ref<Theme>('dark')

export function useTheme() {
  function toggleTheme() {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
    applyTheme(currentTheme.value)
  }

  function setTheme(theme: Theme) {
    currentTheme.value = theme
    applyTheme(theme)
  }

  function applyTheme(theme: Theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('gantt-theme', theme)
    }
  }

  function initTheme() {
    const stored = localStorage.getItem('gantt-theme') as Theme | null
    if (stored) {
      currentTheme.value = stored
    }
    applyTheme(currentTheme.value)
  }

  return {
    currentTheme,
    toggleTheme,
    setTheme,
    initTheme
  }
}