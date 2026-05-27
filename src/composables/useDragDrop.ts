import { ref, computed } from 'vue'

export interface DragState {
  isDragging: boolean
  draggedItem: any | null
  dropTarget: { rowId: string; x: number } | null
}

export function useDragDrop(onDrop?: (itemId: string, newRowId: string, newStart: number, newEnd: number) => void) {
  const dragState = ref<DragState>({
    isDragging: false,
    draggedItem: null,
    dropTarget: null
  })

  const isDragging = computed(() => dragState.value.isDragging)
  const draggedItem = computed(() => dragState.value.draggedItem)

  function startDrag(item: any, event: MouseEvent) {
    event.dataTransfer?.setData('text/plain', item.id)
    dragState.value = {
      isDragging: true,
      draggedItem: item,
      dropTarget: null
    }
  }

  function endDrag() {
    dragState.value = {
      isDragging: false,
      draggedItem: null,
      dropTarget: null
    }
  }

  function handleDrop(rowId: string, x: number, start: number, end: number) {
    if (dragState.value.draggedItem && onDrop) {
      onDrop(dragState.value.draggedItem.id, rowId, start, end)
    }
    endDrag()
  }

  function getDropPosition(event: DragEvent, rowElement: HTMLElement, timelineStart: number, dayWidth: number): { rowId: string; x: number; start: number; end: number } {
    const rect = rowElement.getBoundingClientRect()
    const x = event.clientX - rect.left
    const start = timelineStart + (x / dayWidth) * 86400000
    const end = start + (dragState.value.draggedItem?.time.end - dragState.value.draggedItem?.time.start) || 86400000

    return {
      rowId: rowElement.dataset.rowId || '',
      x,
      start,
      end
    }
  }

  return {
    dragState,
    isDragging,
    draggedItem,
    startDrag,
    endDrag,
    handleDrop,
    getDropPosition
  }
}