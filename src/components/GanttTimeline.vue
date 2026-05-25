<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { GanttItem, GanttRow, Usuario } from '@/types/gantt'

interface Props {
  items: GanttItem[]
  itemsByRow: Map<string, GanttItem[]>
  rowMap: Map<string, GanttRow>
  rows: GanttRow[]
  timelineStart: number
  timelineEnd: number
  timelineWidth: number
  scrollLeft: number
  currentUser?: Usuario
  onScroll: (scrollLeft: number) => void
  onItemMove: (itemId: string, newRowId: string, newStart: number, newEnd: number) => void
  onItemResize: (itemId: string, newStart: number, newEnd: number) => void
  onItemEdit?: (item: GanttItem) => void
  onItemDelete?: (itemId: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  onItemEdit: undefined,
  onItemDelete: undefined
})

const timelineRef = ref<HTMLElement | null>(null)
const ROW_HEIGHT = 44

const rowsArray = computed(() => [...props.rowMap.values()])

// Generate timeline segments (days/weeks/months depending on zoom)
const timelineSegments = computed(() => {
  const segments: Array<{ start: number; end: number; label: string; isWeekend: boolean; isToday: boolean }> = []
  const MS_PER_DAY = 86400000

  let current = props.timelineStart
  const dayStart = new Date(props.timelineStart)
  dayStart.setHours(0, 0, 0, 0)

  while (current < props.timelineEnd) {
    const dayDate = new Date(current)
    const dayOfWeek = dayDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isToday = dayDate.getTime() === today.getTime()

    const label = date(current).format('DD MMM')

    segments.push({
      start: current,
      end: current + MS_PER_DAY,
      label,
      isWeekend,
      isToday
    })

    current += MS_PER_DAY
  }

  return segments
})

function getItemPosition(item: GanttItem) {
  const totalDuration = props.timelineEnd - props.timelineStart
  const itemStartOffset = item.time.start - props.timelineStart
  const itemEndOffset = item.time.end - props.timelineStart

  const left = (itemStartOffset / totalDuration) * props.timelineWidth
  const width = Math.max(((itemEndOffset - itemStartOffset) / totalDuration) * props.timelineWidth, 20)

  return { left, width }
}

function getRowTop(rowId: string): number {
  const index = rowsArray.value.findIndex(r => r.id === rowId)
  return index * ROW_HEIGHT
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  props.onScroll(target.scrollLeft)
}

// Tooltip state
const tooltip = ref<{ visible: boolean; item: GanttItem | null; x: number; y: number }>({
  visible: false,
  item: null,
  x: 0,
  y: 0
})

function showTooltip(e: MouseEvent, item: GanttItem) {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  tooltip.value = {
    visible: true,
    item,
    x: rect.left + rect.width / 2,
    y: rect.top - 10
  }
}

function hideTooltip() {
  tooltip.value.visible = false
  tooltip.value.item = null
}

function formatDate(timestamp: number): string {
  return date(timestamp).format('DD MMM YYYY HH:mm')
}

// Drag state
const dragging = ref<GanttItem | null>(null)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartLeft = ref(0)
const dragStartTop = ref(0)
const dragStartRowId = ref('')
const dragStartTimeStart = ref(0)
const dragStartTimeEnd = ref(0)
const currentDropRowId = ref<string | null>(null)

function startDrag(e: MouseEvent, item: GanttItem) {
  e.preventDefault()
  e.stopPropagation()

  dragging.value = item
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  dragStartLeft.value = getItemPosition(item).left
  dragStartTop.value = getRowTop(item.rowId)
  dragStartRowId.value = item.rowId
  dragStartTimeStart.value = item.time.start
  dragStartTimeEnd.value = item.time.end

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', stopDrag)
}

function onDragMove(e: MouseEvent) {
  if (!dragging.value) return

  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  const newLeft = dragStartLeft.value + deltaX
  const newTop = dragStartTop.value + deltaY

  const newTimeStart = dragStartTimeStart.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)
  const duration = dragStartTimeEnd.value - dragStartTimeStart.value
  const newTimeEnd = newTimeStart + duration

  const element = document.querySelector(`[data-item-id="${dragging.value.id}"]`) as HTMLElement
  if (element) {
    element.style.left = newLeft + 'px'
    element.style.top = newTop + 'px'
  }

  const newRowId = getRowIdFromY(e.clientY)
  if (newRowId !== currentDropRowId.value) {
    currentDropRowId.value = newRowId
  }
}

function getRowIdFromY(clientY: number): string | null {
  if (!timelineRef.value) return null
  const rect = timelineRef.value.getBoundingClientRect()
  const relativeY = clientY - rect.top + timelineRef.value.scrollTop
  const rowIndex = Math.floor(relativeY / ROW_HEIGHT)
  if (rowIndex >= 0 && rowIndex < props.rows.length) {
    return props.rows[rowIndex].id
  }
  return null
}

function stopDrag(e: MouseEvent) {
  if (!dragging.value) return

  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  const newTimeStart = dragStartTimeStart.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)
  const duration = dragStartTimeEnd.value - dragStartTimeStart.value
  const newTimeEnd = newTimeStart + duration

  const newRowId = currentDropRowId.value || dragging.value.rowId

  if (newRowId !== dragStartRowId.value) {
    props.onItemMove(dragging.value.id, newRowId, newTimeStart, newTimeEnd)
  } else {
    props.onItemMove(dragging.value.id, dragging.value.rowId, newTimeStart, newTimeEnd)
  }

  dragging.value = null
  currentDropRowId.value = null
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
}

// Resize state
const resizing = ref<{ item: GanttItem; edge: 'left' | 'right' } | null>(null)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)
const resizeStartLeft = ref(0)
const resizeStartTimeStart = ref(0)
const resizeStartTimeEnd = ref(0)

function startResize(e: MouseEvent, item: GanttItem, edge: 'left' | 'right') {
  e.preventDefault()
  e.stopPropagation()

  resizing.value = { item, edge }
  resizeStartX.value = e.clientX
  resizeStartWidth.value = getItemPosition(item).width
  resizeStartLeft.value = getItemPosition(item).left
  resizeStartTimeStart.value = item.time.start
  resizeStartTimeEnd.value = item.time.end

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', stopResize)
}

function onResizeMove(e: MouseEvent) {
  if (!resizing.value) return

  const deltaX = e.clientX - resizeStartX.value
  const item = resizing.value.item

  if (resizing.value.edge === 'right') {
    const newWidth = Math.max(20, resizeStartWidth.value + deltaX)
    const newTimeEnd = resizeStartTimeEnd.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)

    const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement
    if (element) {
      element.style.width = newWidth + 'px'
    }
  } else {
    const newLeft = resizeStartLeft.value + deltaX
    const newTimeStart = resizeStartTimeStart.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)

    if (newLeft >= 0) {
      const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement
      if (element) {
        element.style.left = newLeft + 'px'
        element.style.width = (resizeStartWidth.value - deltaX) + 'px'
      }
    }
  }
}

function stopResize(e: MouseEvent) {
  if (!resizing.value) return

  const deltaX = e.clientX - resizeStartX.value
  const item = resizing.value.item

  if (resizing.value.edge === 'right') {
    const newTimeEnd = resizeStartTimeEnd.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)
    props.onItemResize(item.id, item.time.start, newTimeEnd)
  } else {
    const newLeft = resizeStartLeft.value + deltaX
    if (newLeft >= 0) {
      const newTimeStart = resizeStartTimeStart.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)
      props.onItemResize(item.id, newTimeStart, item.time.end)
    }
  }

  resizing.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', stopResize)
}

// Today marker position
const todayMarkerX = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()

  if (todayTime < props.timelineStart || todayTime > props.timelineEnd) {
    return null
  }

  const totalDuration = props.timelineEnd - props.timelineStart
  return ((todayTime - props.timelineStart) / totalDuration) * props.timelineWidth
})

// Context menu
const contextMenu = ref<{ visible: boolean; x: number; y: number; item: GanttItem | null }>({
  visible: false,
  x: 0,
  y: 0,
  item: null
})

function showContextMenu(e: MouseEvent, item: GanttItem) {
  e.preventDefault()
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    item
  }
}

function hideContextMenu() {
  contextMenu.value.visible = false
  contextMenu.value.item = null
}

function handleContextEdit() {
  if (contextMenu.value.item) {
    props.onItemEdit?.(contextMenu.value.item)
  }
  hideContextMenu()
}

function handleContextDelete() {
  if (contextMenu.value.item) {
    props.onItemDelete?.(contextMenu.value.item.id)
  }
  hideContextMenu()
}

function handleContextCopy() {
  if (contextMenu.value.item) {
    const item = contextMenu.value.item
    navigator.clipboard.writeText(`${item.label}: ${new Date(item.time.start).toLocaleDateString()} - ${new Date(item.time.end).toLocaleDateString()}`)
  }
  hideContextMenu()
}

onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})
</script>

<template>
  <div class="gantt-timeline" ref="timelineRef" @scroll="handleScroll">
    <div
      class="gantt-timeline-content"
      :style="{ width: timelineWidth + 'px', height: rows.length * ROW_HEIGHT + 'px' }"
    >
      <!-- Time segments (days) -->
      <div class="gantt-segments">
        <div
          v-for="(seg, i) in timelineSegments"
          :key="i"
          class="gantt-segment"
          :class="{ 'is-weekend': seg.isWeekend, 'is-today': seg.isToday }"
          :style="{
            left: ((seg.start - timelineStart) / (timelineEnd - timelineStart)) * timelineWidth + 'px',
            width: (86400000 / (timelineEnd - timelineStart)) * timelineWidth + 'px'
          }"
        >
          <span class="gantt-segment-label">{{ seg.label }}</span>
        </div>
      </div>

      <!-- Today marker -->
      <div
        v-if="todayMarkerX !== null"
        class="gantt-today-marker"
        :style="{ left: todayMarkerX + 'px' }"
      >
        <div class="gantt-today-line"></div>
        <div class="gantt-today-label">Today</div>
      </div>

      <!-- Row backgrounds -->
      <div
        v-for="(row, rowIndex) in rows"
        :key="row.id"
        class="gantt-row-bg"
        :class="{ 'is-even': rowIndex % 2 === 0 }"
        :style="{ top: getRowTop(row.id) + 'px', height: ROW_HEIGHT + 'px' }"
      ></div>

      <!-- Items -->
      <div
        v-for="row in rows"
        :key="row.id"
        class="gantt-row"
        :style="{ top: getRowTop(row.id) + 'px', height: ROW_HEIGHT + 'px' }"
      >
        <div
          v-for="item in itemsByRow.get(row.id)"
          :key="item.id"
          class="gantt-item"
          :data-item-id="item.id"
          :style="{
            left: getItemPosition(item).left + 'px',
            width: getItemPosition(item).width + 'px'
          }"
          @mousedown="startDrag($event, item)"
          @mouseenter="showTooltip($event, item)"
          @mouseleave="hideTooltip"
          @dblclick="props.onItemEdit?.(item)"
          @contextmenu="showContextMenu($event, item)"
        >
          <div class="gantt-item-content">
            <span class="gantt-item-label">{{ item.label }}</span>
            <span v-if="item.progress !== undefined" class="gantt-item-progress">{{ item.progress }}%</span>
          </div>
          <div class="gantt-item-drag-hint">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
              <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
            </svg>
          </div>
          <div class="gantt-progress-bar" v-if="item.progress !== undefined">
            <div class="gantt-progress-fill" :style="{ width: item.progress + '%' }"></div>
          </div>
          <div
            class="gantt-resize-handle gantt-resize-left"
            @mousedown.stop="startResize($event, item, 'left')"
          ></div>
          <div
            class="gantt-resize-handle gantt-resize-right"
            @mousedown.stop="startResize($event, item, 'right')"
          ></div>
          <div class="gantt-item-overlay">
            <button class="gantt-overlay-btn" @click.stop="props.onItemEdit?.(item)" title="Edit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="gantt-overlay-btn delete" @click.stop="props.onItemDelete?.(item.id)" title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltip.visible && tooltip.item"
        class="gantt-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        <div class="gantt-tooltip-title">{{ tooltip.item.label }}</div>
        <div class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">Start:</span>
          <span>{{ formatDate(tooltip.item.time.start) }}</span>
        </div>
        <div class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">End:</span>
          <span>{{ formatDate(tooltip.item.time.end) }}</span>
        </div>
        <div class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">Duration:</span>
          <span>{{ Math.round((tooltip.item.time.end - tooltip.item.time.start) / 86400000) }} days</span>
        </div>
        <div v-if="tooltip.item.progress !== undefined" class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">Progress:</span>
          <span>{{ tooltip.item.progress }}%</span>
        </div>
      </div>
    </Teleport>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="gantt-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <button class="context-menu-item" @click="handleContextEdit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Task
        </button>
        <button class="context-menu-item" @click="handleContextCopy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy to Clipboard
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item danger" @click="handleContextDelete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Delete Task
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.gantt-timeline {
  flex: 1;
  overflow: auto;
  position: relative;
  background: #0a0a14;
}

.gantt-timeline-content {
  position: relative;
  min-height: 100%;
}

.gantt-segments {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.gantt-segment {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px solid #1a1a2e;
  background: rgba(255, 255, 255, 0.01);
}

.gantt-segment.is-weekend {
  background: rgba(99, 102, 241, 0.05);
}

.gantt-segment.is-today {
  background: rgba(99, 102, 241, 0.15);
}

.gantt-segment-label {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
}

.gantt-today-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 50;
  pointer-events: none;
}

.gantt-today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: linear-gradient(180deg, #ef4444 0%, #f97316 50%, #ef4444 100%);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
}

.gantt-today-label {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.gantt-row-bg {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}

.gantt-row-bg.is-even {
  background: rgba(255, 255, 255, 0.02);
}

.gantt-row {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
}

.gantt-item {
  position: absolute;
  height: 32px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border-radius: 8px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: grab;
  user-select: none;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.gantt-item:hover {
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px) scale(1.02);
  z-index: 20;
}

.gantt-item:active {
  cursor: grabbing;
  transform: translateY(-1px) scale(1.01);
}

.gantt-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding-right: 20px;
}

.gantt-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.gantt-item-progress {
  font-size: 10px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 6px;
  border-radius: 4px;
}

.gantt-item-drag-hint {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.4;
}

.gantt-item-overlay {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.gantt-item:hover .gantt-item-overlay {
  opacity: 1;
}

.gantt-overlay-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.gantt-overlay-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.gantt-overlay-btn.delete:hover {
  background: #dc2626;
}

.gantt-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.gantt-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.gantt-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: ew-resize;
  z-index: 15;
  opacity: 0;
  transition: opacity 0.2s;
}

.gantt-item:hover .gantt-resize-handle {
  opacity: 1;
}

.gantt-resize-left {
  left: 0;
  border-radius: 8px 0 0 8px;
  background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, transparent 100%);
}

.gantt-resize-right {
  right: 0;
  border-radius: 0 8px 8px 0;
  background: linear-gradient(-90deg, rgba(255,255,255,0.2) 0%, transparent 100%);
}

.gantt-resize-handle:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>

<style>
.gantt-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  padding: 12px 16px;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  min-width: 180px;
}

.gantt-tooltip-title {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #3a3a5a;
}

.gantt-tooltip-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

.gantt-tooltip-label {
  color: rgba(255, 255, 255, 0.5);
}

.gantt-context-menu {
  position: fixed;
  background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  padding: 6px;
  z-index: 1001;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  min-width: 160px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.context-menu-item:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #fff;
}

.context-menu-item.danger {
  color: #f87171;
}

.context-menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

.context-menu-divider {
  height: 1px;
  background: #3a3a5a;
  margin: 6px 0;
}
</style>