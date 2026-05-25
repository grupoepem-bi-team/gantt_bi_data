<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { GanttConfig, GanttRow, GanttItem } from '@/types/gantt'
import { startOfDay, endOfDay } from '@/utils/date'
import GanttList from './GanttList.vue'
import GanttTimeline from './GanttTimeline.vue'
import ItemModal from './ItemModal.vue'
import { useExcelExport } from '@/composables/useExcelExport'

interface Props {
  config: GanttConfig
}

const props = defineProps<Props>()

const emit = defineEmits(['update:config'])

const { exportToExcel } = useExcelExport()

const zoomLevel = ref(17)
const scrollLeft = ref(0)
const timelineWidth = ref(2000)
const modalOpen = ref(false)
const editingItem = ref<GanttItem | undefined>(undefined)
const modalRef = ref<InstanceType<typeof ItemModal> | null>(null)

const listRef = ref<InstanceType<typeof GanttList> | null>(null)
const timelineRef = ref<InstanceType<typeof GanttTimeline> | null>(null)

const timelineStart = computed(() => {
  if (props.config.startDate) {
    return startOfDay(props.config.startDate).valueOf()
  }
  const items = props.config.items
  if (items.length === 0) return Date.now() - 86400000 * 7
  const minTime = Math.min(...items.map(i => i.time.start))
  return startOfDay(minTime).valueOf()
})

const timelineEnd = computed(() => {
  if (props.config.endDate) {
    return endOfDay(props.config.endDate).valueOf()
  }
  const items = props.config.items
  if (items.length === 0) return Date.now() + 86400000 * 30
  const maxTime = Math.max(...items.map(i => i.time.end))
  return endOfDay(maxTime).valueOf()
})

const rowMap = computed(() => {
  const map = new Map<string, GanttRow>()
  props.config.rows.forEach(row => map.set(row.id, row))
  return map
})

const itemsByRow = computed(() => {
  const map = new Map<string, GanttItem[]>()
  props.config.items.forEach(item => {
    const rowItems = map.get(item.rowId) || []
    rowItems.push(item)
    map.set(item.rowId, rowItems)
  })
  return map
})

function handleScroll(scrollL: number) {
  scrollLeft.value = scrollL
  if (listRef.value) {
    const listEl = listRef.value.$el as HTMLElement
    if (listEl) listEl.scrollLeft = scrollL
  }
  if (timelineRef.value) {
    const timelineEl = timelineRef.value.$el as HTMLElement
    if (timelineEl) timelineEl.scrollLeft = scrollL
  }
}

function handleItemMove(itemId: string, newRowId: string, newStart: number, newEnd: number) {
  const itemIndex = props.config.items.findIndex(i => i.id === itemId)
  if (itemIndex !== -1) {
    props.config.items[itemIndex] = {
      ...props.config.items[itemIndex],
      rowId: newRowId,
      time: { start: Math.round(newStart), end: Math.round(newEnd) }
    }
  }
}

function handleItemResize(itemId: string, newStart: number, newEnd: number) {
  const itemIndex = props.config.items.findIndex(i => i.id === itemId)
  if (itemIndex !== -1) {
    props.config.items[itemIndex] = {
      ...props.config.items[itemIndex],
      time: { start: Math.round(newStart), end: Math.round(newEnd) }
    }
  }
}

function zoomIn() {
  if (zoomLevel.value < 30) zoomLevel.value++
}

function zoomOut() {
  if (zoomLevel.value > 5) zoomLevel.value--
}

function openCreateModal() {
  editingItem.value = undefined
  modalOpen.value = true
  setTimeout(() => {
    modalRef.value?.initForm()
  }, 50)
}

function openEditModal(item: GanttItem) {
  editingItem.value = item
  modalOpen.value = true
  setTimeout(() => {
    modalRef.value?.initForm()
  }, 50)
}

function handleModalSave(item: GanttItem) {
  const index = props.config.items.findIndex(i => i.id === item.id)
  if (index !== -1) {
    const updatedItems = [...props.config.items]
    updatedItems[index] = item
    emit('update:config', { ...props.config, items: updatedItems })
  } else {
    emit('update:config', { ...props.config, items: [...props.config.items, item] })
  }
}

function handleModalClose() {
  modalOpen.value = false
  editingItem.value = undefined
}

function deleteItem(itemId: string) {
  emit('update:config', {
    ...props.config,
    items: props.config.items.filter(i => i.id !== itemId)
  })
}

function handleExportExcel() {
  exportToExcel(props.config, 'gantt-chart')
}

function getRowIndex(rowId: string): number {
  return props.config.rows.findIndex(r => r.id === rowId)
}

defineExpose({ zoomIn, zoomOut, openCreateModal, openEditModal, deleteItem })

watch(zoomLevel, () => {
  const baseWidth = 2000
  timelineWidth.value = baseWidth * Math.pow(1.5, (zoomLevel.value - 17) / 5)
})

onMounted(() => {
  const baseWidth = 2000
  timelineWidth.value = baseWidth * Math.pow(1.5, (zoomLevel.value - 17) / 5)
})
</script>

<template>
  <div class="gantt-container">
    <div class="gantt-header">
      <div class="gantt-list-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>
        </svg>
        Tasks
        <button class="add-btn" @click="openCreateModal" title="Add Task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="export-btn" @click="handleExportExcel" title="Export to Excel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span>Excel</span>
        </button>
      </div>
      <div class="gantt-timeline-header" :style="{ width: timelineWidth + 'px' }">
        <div class="gantt-dates-row">
          <div
            v-for="n in Math.ceil(timelineWidth / 200)"
            :key="n"
            class="gantt-date-cell"
          >
            <div class="gantt-date-main">{{ new Date(timelineStart + ((n-1) * 200 / timelineWidth) * (timelineEnd - timelineStart)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</div>
            <div class="gantt-date-sub">{{ new Date(timelineStart + ((n-1) * 200 / timelineWidth) * (timelineEnd - timelineStart)).getFullYear() }}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="gantt-body">
      <GanttList
        ref="listRef"
        :rows="config.rows"
        :columns="config.columns"
        :row-map="rowMap"
        :items-by-row="itemsByRow"
        :timeline-start="timelineStart"
        :timeline-end="timelineEnd"
        :timeline-width="timelineWidth"
        :scroll-left="scrollLeft"
        :on-scroll="handleScroll"
        :on-item-move="handleItemMove"
        :on-item-resize="handleItemResize"
        :on-item-edit="openEditModal"
        :on-item-delete="deleteItem"
      />
      <GanttTimeline
        ref="timelineRef"
        :items="config.items"
        :items-by-row="itemsByRow"
        :row-map="rowMap"
        :rows="config.rows"
        :timeline-start="timelineStart"
        :timeline-end="timelineEnd"
        :timeline-width="timelineWidth"
        :scroll-left="scrollLeft"
        :on-scroll="handleScroll"
        :on-item-move="handleItemMove"
        :on-item-resize="handleItemResize"
        :on-item-edit="openEditModal"
        :on-item-delete="deleteItem"
      />
      <div class="gantt-minimap">
        <div
          class="minimap-viewport"
          :style="{
            left: (scrollLeft / timelineWidth * 100) + '%',
            width: (100 / (timelineWidth / 2000)) + '%'
          }"
        ></div>
        <div
          v-for="item in config.items"
          :key="item.id"
          class="minimap-item"
          :style="{
            left: ((item.time.start - timelineStart) / (timelineEnd - timelineStart) * 100) + '%',
            width: ((item.time.end - item.time.start) / (timelineEnd - timelineStart) * 100) + '%',
            top: getRowIndex(item.rowId) * 16 + 4 + 'px'
          }"
        ></div>
      </div>
    </div>
    <ItemModal
      ref="modalRef"
      :item="editingItem"
      :rows="config.rows"
      :is-open="modalOpen"
      @close="handleModalClose"
      @save="handleModalSave"
    />
    <div class="gantt-controls">
      <button class="zoom-btn" @click="zoomOut">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <span class="zoom-label">Zoom {{ zoomLevel }}</span>
      <button class="zoom-btn" @click="zoomIn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.gantt-container {
  display: flex;
  flex-direction: column;
  height: 500px;
  border: 1px solid #2a2a4a;
  border-radius: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f0f1a;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.gantt-header {
  display: flex;
  border-bottom: 1px solid #2a2a4a;
  background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
}

.gantt-list-header {
  width: 200px;
  min-width: 200px;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #e0e0e0;
  border-right: 1px solid #2a2a4a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.gantt-list-header svg {
  color: #6366f1;
}

.add-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border: none;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.add-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  border-radius: 6px;
  cursor: pointer;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.export-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.export-btn span {
  font-size: 11px;
}

.gantt-timeline-header {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
}

.gantt-dates-row {
  display: flex;
  height: 100%;
  align-items: center;
}

.gantt-date-cell {
  min-width: 200px;
  padding: 8px 12px;
  text-align: center;
  border-right: 1px solid #1f1f3a;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gantt-date-main {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

.gantt-date-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

.gantt-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.gantt-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 12px;
  border-top: 1px solid #2a2a4a;
  background: linear-gradient(180deg, #16162a 0%, #1a1a2e 100%);
}

.gantt-controls button.zoom-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #3a3a5a;
  background: linear-gradient(180deg, #2a2a4a 0%, #1f1f3a 100%);
  border-radius: 8px;
  cursor: pointer;
  color: #a0a0c0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.gantt-controls button.zoom-btn:hover {
  background: linear-gradient(180deg, #3a3a5a 0%, #2a2a4a 100%);
  color: #fff;
  border-color: #6366f1;
}

.gantt-controls span.zoom-label {
  min-width: 100px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.gantt-minimap {
  position: absolute;
  bottom: 60px;
  right: 16px;
  width: 200px;
  height: 80px;
  background: rgba(26, 26, 46, 0.9);
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.minimap-viewport {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid #6366f1;
  cursor: grab;
}

.minimap-item {
  position: absolute;
  height: 8px;
  background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 2px;
  opacity: 0.7;
}
</style>