<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GanttItem, GanttRow, Usuario } from '@/types/gantt'
import { date } from '@/utils/date'
import { useAuthStore } from '@/stores/authStore'

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
  isAdmin?: boolean
  canModify?: (item: GanttItem) => boolean
  onScroll: (scrollLeft: number) => void
  onItemMove: (itemId: string, newRowId: string, newStart: number, newEnd: number) => void
  onItemResize: (itemId: string, newStart: number, newEnd: number) => void
  onItemEdit?: (item: GanttItem) => void
  onItemDelete?: (itemId: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  isAdmin: false,
  onItemEdit: undefined,
  onItemDelete: undefined,
  canModify: () => true
})

const authStore = useAuthStore()

function getUserById(id: string) {
  const users = authStore.usuariosDisponibles || []
  if (!users.length) return undefined
  return users.find(u => u.id === id)
}

function getAssignedUserNames(item: GanttItem): string {
  const ids = item.assignedUserIds || (item.assignedUserId ? [item.assignedUserId] : [])
  if (ids.length === 0) return 'Sin asignar'
  return ids.map(id => getUserById(id)?.nombre || id).join(', ')
}

function getAssignedUsers(item: GanttItem) {
  const ids = item.assignedUserIds || (item.assignedUserId ? [item.assignedUserId] : [])
  return ids.map(id => getUserById(id)).filter(Boolean) as Usuario[]
}

const timelineRef = ref<HTMLElement | null>(null)
const ROW_HEIGHT = 44

function getItemPosition(item: GanttItem) {
  const totalDuration = props.timelineEnd - props.timelineStart
  const itemStartOffset = item.time.start - props.timelineStart
  const itemEndOffset = item.time.end - props.timelineStart

  const left = (itemStartOffset / totalDuration) * props.timelineWidth
  const width = Math.max(((itemEndOffset - itemStartOffset) / totalDuration) * props.timelineWidth, 20)

  return { left, width }
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  props.onScroll(target.scrollLeft)
}

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

// Drag state - only horizontal movement within the same row
const dragging = ref<GanttItem | null>(null)
const dragStartX = ref(0)
const dragStartTimeStart = ref(0)
const dragStartTimeEnd = ref(0)
const dragDeltaX = ref(0)

function startDrag(e: MouseEvent, item: GanttItem) {
  if (!props.canModify(item)) return
  e.preventDefault()
  e.stopPropagation()

  dragging.value = item
  dragStartX.value = e.clientX
  dragStartTimeStart.value = item.time.start
  dragStartTimeEnd.value = item.time.end
  dragDeltaX.value = 0

  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', stopDrag)
}

function onDragMove(e: MouseEvent) {
  if (!dragging.value) return

  const deltaX = e.clientX - dragStartX.value
  dragDeltaX.value = deltaX

  const element = document.querySelector(`[data-item-id="${dragging.value.id}"]`) as HTMLElement
  if (element) {
    const origLeft = getItemPosition(dragging.value).left
    element.style.left = (origLeft + deltaX) + 'px'
    element.style.zIndex = '50'
    element.style.opacity = '0.85'
  }
}

function stopDrag(e: MouseEvent) {
  if (!dragging.value) return

  const deltaX = e.clientX - dragStartX.value
  const newTimeStart = dragStartTimeStart.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)
  const duration = dragEndTimeDrag.value - dragStartTimeStart.value
  const newTimeEnd = newTimeStart + duration

  const element = document.querySelector(`[data-item-id="${dragging.value.id}"]`) as HTMLElement
  if (element) {
    element.style.zIndex = ''
    element.style.opacity = ''
  }

  if (Math.abs(deltaX) > 5) {
    props.onItemMove(dragging.value.id, dragging.value.rowId, newTimeStart, newTimeEnd)
  }

  dragging.value = null
  dragDeltaX.value = 0
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', stopDrag)
}

const dragEndTimeDrag = computed(() => {
  return dragStartTimeEnd.value
})

// Resize state
const resizing = ref<{ item: GanttItem; edge: 'left' | 'right' } | null>(null)
const resizeStartX = ref(0)
const resizeStartWidth = ref(0)
const resizeStartTimeStart = ref(0)
const resizeStartTimeEnd = ref(0)

function startResize(e: MouseEvent, item: GanttItem, edge: 'left' | 'right') {
  if (!props.canModify(item)) return
  e.preventDefault()
  e.stopPropagation()

  resizing.value = { item, edge }
  resizeStartX.value = e.clientX
  resizeStartWidth.value = getItemPosition(item).width
  resizeStartTimeStart.value = item.time.start
  resizeStartTimeEnd.value = item.time.end

  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', stopResize)
}

function onResizeMove(e: MouseEvent) {
  if (!resizing.value) return

  const deltaX = e.clientX - resizeStartX.value
  const item = resizing.value.item

  const element = document.querySelector(`[data-item-id="${item.id}"]`) as HTMLElement
  if (!element) return

  if (resizing.value.edge === 'right') {
    const newWidth = Math.max(20, resizeStartWidth.value + deltaX)
    element.style.width = newWidth + 'px'
  } else {
    const origLeft = getItemPosition(item).left
    const newLeft = origLeft + deltaX
    if (newLeft >= 0) {
      element.style.left = newLeft + 'px'
      element.style.width = Math.max(20, resizeStartWidth.value - deltaX) + 'px'
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
    const newTimeStart = resizeStartTimeStart.value + (deltaX / props.timelineWidth) * (props.timelineEnd - props.timelineStart)
    if (newTimeStart < item.time.end) {
      props.onItemResize(item.id, newTimeStart, item.time.end)
    }
  }

  resizing.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', stopResize)
}

// Timeline segments
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

// Today marker
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

      <!-- Rows with their items -->
      <div
        v-for="(row, rowIndex) in rows"
        :key="row.id"
        class="gantt-row"
        :class="{ 'is-even': rowIndex % 2 === 0 }"
        :style="{ top: rowIndex * ROW_HEIGHT + 'px', height: ROW_HEIGHT + 'px' }"
      >
        <!-- Row items - clipped to row bounds -->
        <div class="gantt-row-items">
          <div
            v-for="item in (itemsByRow.get(row.id) || [])"
            :key="item.id"
            class="gantt-item"
            :data-item-id="item.id"
            :style="{
              left: getItemPosition(item).left + 'px',
              width: getItemPosition(item).width + 'px'
            }"
            @mousedown="canModify(item) ? startDrag($event, item) : undefined"
            @mouseenter="showTooltip($event, item)"
            @mouseleave="hideTooltip"
            @dblclick="canModify(item) ? props.onItemEdit?.(item) : undefined"
            @contextmenu="canModify(item) ? showContextMenu($event, item) : undefined"
          >
            <div class="gantt-item-content">
              <span class="gantt-item-label">{{ item.label }}</span>
              <div v-if="getAssignedUsers(item).length > 0" class="gantt-item-avatars">
                <span
                  v-for="u in getAssignedUsers(item).slice(0, 3)"
                  :key="u.id"
                  class="gantt-avatar-sm"
                  :style="{ background: u.color || '#6366f1' }"
                  :title="u.nombre"
                >{{ u.avatar || u.nombre.substring(0, 2).toUpperCase() }}</span>
                <span v-if="getAssignedUsers(item).length > 3" class="gantt-avatar-more">+{{ getAssignedUsers(item).length - 3 }}</span>
              </div>
              <span v-if="item.progress !== undefined && item.progress > 0" class="gantt-item-progress">{{ item.progress }}%</span>
            </div>
            <div class="gantt-progress-bar" v-if="item.progress !== undefined && item.progress > 0">
              <div class="gantt-progress-fill" :style="{ width: item.progress + '%' }"></div>
            </div>
            <div
              v-if="canModify(item)"
              class="gantt-resize-handle gantt-resize-left"
              @mousedown.stop="startResize($event, item, 'left')"
            ></div>
            <div
              v-if="canModify(item)"
              class="gantt-resize-handle gantt-resize-right"
              @mousedown.stop="startResize($event, item, 'right')"
            ></div>
            <div class="gantt-item-overlay" v-if="canModify(item)">
              <button class="gantt-overlay-btn edit" @click.stop="props.onItemEdit?.(item)" title="Editar tarea">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="gantt-overlay-btn delete" @click.stop="props.onItemDelete?.(item.id)" title="Eliminar tarea">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
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
          <span class="gantt-tooltip-label">Inicio:</span>
          <span>{{ formatDate(tooltip.item.time.start) }}</span>
        </div>
        <div class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">Fin:</span>
          <span>{{ formatDate(tooltip.item.time.end) }}</span>
        </div>
        <div class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">Duracion:</span>
          <span>{{ Math.round((tooltip.item.time.end - tooltip.item.time.start) / 86400000) }} dias</span>
        </div>
        <div v-if="tooltip.item.progress !== undefined && tooltip.item.progress > 0" class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">Progreso:</span>
          <span>{{ tooltip.item.progress }}%</span>
        </div>
        <div class="gantt-tooltip-row">
          <span class="gantt-tooltip-label">Asignados:</span>
          <span class="gantt-tooltip-users">{{ getAssignedUserNames(tooltip.item) }}</span>
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
          Editar tarea
        </button>
        <button class="context-menu-item" @click="handleContextCopy">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copiar al portapapeles
        </button>
        <div class="context-menu-divider"></div>
        <button class="context-menu-item danger" @click="handleContextDelete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Eliminar tarea
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
  background: var(--bg-timeline);
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
  border-right: 1px solid var(--border-primary);
  background: transparent;
}

.gantt-segment.is-weekend {
  background: var(--bg-weekend);
}

.gantt-segment.is-today {
  background: var(--bg-today);
}

.gantt-segment-label {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
  color: var(--text-dimmed);
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

.gantt-row {
  position: absolute;
  left: 0;
  right: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--border-primary);
}

.gantt-row.is-even {
  background: var(--bg-weekend);
}

.gantt-row-items {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.gantt-item {
  position: absolute;
  height: 32px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, var(--bg-item-start) 0%, var(--bg-item-end) 100%);
  color: white;
  border-radius: 8px;
  padding: 0 26px 0 12px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: grab;
  user-select: none;
  box-shadow: var(--shadow-item), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: box-shadow 0.2s ease, transform 0.15s ease;
  z-index: 10;
  min-width: 30px;
}

.gantt-item:hover {
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.02);
  z-index: 20;
}

.gantt-item:active {
  cursor: grabbing;
  transform: translateY(-50%) scale(1.01);
}

.gantt-item-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  width: 100%;
  overflow: hidden;
}

.gantt-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  min-width: 0;
}

.gantt-item-progress {
  font-size: 10px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 6px;
  border-radius: 4px;
}

.gantt-item-avatars {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.gantt-avatar-sm {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
}

.gantt-avatar-more {
  font-size: 8px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 8px;
  color: #fff;
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

.gantt-item-overlay {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.gantt-item:hover .gantt-item-overlay {
  opacity: 1;
}

.gantt-overlay-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.gantt-overlay-btn:hover {
  transform: scale(1.15);
}

.gantt-overlay-btn.edit:hover {
  background: rgba(255, 255, 255, 0.4);
}

.gantt-overlay-btn.delete:hover {
  background: #dc2626;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
}

.gantt-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
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
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  padding: 12px 16px;
  z-index: 1000;
  pointer-events: none;
  box-shadow: var(--shadow-lg);
  min-width: 180px;
}

.gantt-tooltip-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-secondary);
}

.gantt-tooltip-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.gantt-tooltip-label {
  color: var(--text-muted);
}

.gantt-tooltip-users {
  text-align: right;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gantt-context-menu {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  padding: 6px;
  z-index: 1001;
  box-shadow: var(--shadow-lg);
  min-width: 180px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.context-menu-item:hover {
  background: rgba(99, 102, 241, 0.2);
  color: var(--text-primary);
}

.context-menu-item.danger {
  color: #f87171;
}

.context-menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

.context-menu-divider {
  height: 1px;
  background: var(--border-secondary);
  margin: 6px 0;
}
</style>