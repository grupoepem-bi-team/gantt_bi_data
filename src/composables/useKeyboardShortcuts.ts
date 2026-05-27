import { onMounted, onUnmounted } from 'vue'

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  handler: () => void
  description?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  function handleKeyDown(event: KeyboardEvent) {
    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey

      if (keyMatch && ctrlMatch && shiftMatch) {
        event.preventDefault()
        shortcut.handler()
        return
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  function getShortcutLabel(shortcut: KeyboardShortcut): string {
    let label = ''
    if (shortcut.ctrl) label += 'Ctrl+'
    if (shortcut.shift) label += 'Shift+'
    label += shortcut.key.toUpperCase()
    return label
  }

  return {
    shortcuts,
    getShortcutLabel
  }
}