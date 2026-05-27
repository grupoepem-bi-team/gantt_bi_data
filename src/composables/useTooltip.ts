import { ref, computed } from 'vue'

interface TooltipData {
  show: boolean
  x: number
  y: number
  content: string
  item?: any
}

export function useTooltip() {
  const tooltip = ref<TooltipData>({
    show: false,
    x: 0,
    y: 0,
    content: ''
  })

  function showTooltip(event: MouseEvent, content: string, item?: any) {
    tooltip.value = {
      show: true,
      x: event.clientX,
      y: event.clientY,
      content,
      item
    }
  }

  function hideTooltip() {
    tooltip.value.show = false
  }

  function updatePosition(event: MouseEvent) {
    tooltip.value.x = event.clientX
    tooltip.value.y = event.clientY
  }

  return {
    tooltip,
    showTooltip,
    hideTooltip,
    updatePosition
  }
}