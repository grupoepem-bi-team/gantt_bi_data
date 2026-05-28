<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { GanttConfig, GanttRow, GanttItem, Usuario } from '@/types/gantt'
import { useExcelExport } from '@/composables/useExcelExport'
import { useTheme } from '@/composables/useTheme'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}
import { startOfDay, endOfDay } from '@/utils/date'
import GanttList from '@/components/GanttList.vue'
import GanttTimeline from '@/components/GanttTimeline.vue'
import ItemModal from '@/components/ItemModal.vue'

interface Props {
  config: GanttConfig
  currentUser?: Usuario
  isAdmin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAdmin: false
})

const emit = defineEmits(['update:config'])

const { exportToExcel } = useExcelExport()
const { currentTheme, toggleTheme, initTheme } = useTheme()

const zoomLevel = ref(17)
const scrollLeft = ref(0)
const timelineWidth = ref(2000)
const modalOpen = ref(false)
const editingItem = ref<GanttItem | undefined>(undefined)
const modalRef = ref<InstanceType<typeof ItemModal> | null>(null)
const searchQuery = ref('')
const searchMode = ref<'all' | 'text' | 'progress' | 'completed'>('all')
const selectedItemIndex = ref(-1)

const listRef = ref<InstanceType<typeof GanttList> | null>(null)
const timelineRef = ref<InstanceType<typeof GanttTimeline> | null>(null)

const filteredItems = computed(() => {
  if (searchMode.value === 'all') return props.config.items
  if (searchMode.value === 'progress') return props.config.items.filter(i => (i.progress ?? 0) > 0 && (i.progress ?? 0) < 100)
  if (searchMode.value === 'completed') return props.config.items.filter(i => (i.progress ?? 0) === 100)
  const query = searchQuery.value.toLowerCase()
  return props.config.items.filter(item =>
    item.label.toLowerCase().includes(query)
  )
})

const timelineStart = computed(() => {
  if (props.config.startDate) {
    return startOfDay(props.config.startDate).valueOf()
  }
  const items = filteredItems.value
  if (items.length === 0) return Date.now() - 86400000 * 7
  const minTime = Math.min(...items.map(i => i.time.start))
  return startOfDay(minTime).valueOf()
})

const timelineEnd = computed(() => {
  if (props.config.endDate) {
    return endOfDay(props.config.endDate).valueOf()
  }
  const items = filteredItems.value
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
  filteredItems.value.forEach(item => {
    const rowItems = map.get(item.rowId) || []
    rowItems.push(item)
    map.set(item.rowId, rowItems)
  })
  return map
})

const isScrolling = ref(false)

function handleScroll(scrollL: number) {
  if (isScrolling.value) return
  isScrolling.value = true
  scrollLeft.value = scrollL
  if (listRef.value) {
    const listEl = listRef.value.$el as HTMLElement
    if (listEl) listEl.scrollLeft = scrollL
  }
  if (timelineRef.value) {
    const timelineEl = timelineRef.value.$el as HTMLElement
    if (timelineEl) timelineEl.scrollLeft = scrollL
  }
  requestAnimationFrame(() => {
    isScrolling.value = false
  })
}

function canModifyItem(item: GanttItem): boolean {
  return props.isAdmin || item.createdBy === props.currentUser?.id
}

function handleItemRename(itemId: string, newLabel: string) {
  const itemIndex = props.config.items.findIndex(i => i.id === itemId)
  if (itemIndex === -1) return
  const item = props.config.items[itemIndex]
  if (!canModifyItem(item)) return
  const updatedItems = [...props.config.items]
  updatedItems[itemIndex] = { ...updatedItems[itemIndex], label: newLabel }
  emit('update:config', { ...props.config, items: updatedItems })
}

function handleItemMove(itemId: string, newRowId: string, newStart: number, newEnd: number) {
  const itemIndex = props.config.items.findIndex(i => i.id === itemId)
  if (itemIndex !== -1) {
    const item = props.config.items[itemIndex]
    if (!canModifyItem(item)) return
    const updatedItems = [...props.config.items]
    const originalRow = updatedItems[itemIndex].rowId
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      rowId: props.isAdmin ? newRowId : originalRow,
      time: { start: Math.round(newStart), end: Math.round(newEnd) }
    }
    emit('update:config', { ...props.config, items: updatedItems })
  }
}

function handleItemResize(itemId: string, newStart: number, newEnd: number) {
  const itemIndex = props.config.items.findIndex(i => i.id === itemId)
  if (itemIndex !== -1) {
    const item = props.config.items[itemIndex]
    if (!canModifyItem(item)) return
    const updatedItems = [...props.config.items]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      time: { start: Math.round(newStart), end: Math.round(newEnd) }
    }
    emit('update:config', { ...props.config, items: updatedItems })
  }
}

function zoomIn() {
  if (zoomLevel.value < 30) zoomLevel.value++
}

function zoomOut() {
  if (zoomLevel.value > 5) zoomLevel.value--
}

function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }
}

function openCreateModal() {
  editingItem.value = undefined
  modalOpen.value = true
  setTimeout(() => {
    modalRef.value?.initForm()
  }, 50)
}

function openEditModal(item?: GanttItem) {
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

async function handleRowCreate() {
  const label = prompt('Nombre de la nueva categoría:')
  if (!label?.trim()) return
  try {
    const authStore = useAuthStore()
    const res = await fetch(`${API_URL}/rows`, {
      method: 'POST',
      headers: authHeaders(authStore.token),
      body: JSON.stringify({ label: label.trim(), orden: props.config.rows.length })
    })
    if (!res.ok) throw new Error('Failed to create row')
    const newRow = await res.json()
    emit('update:config', { ...props.config, rows: [...props.config.rows, newRow] })
  } catch (err) {
    console.error('Error creating row:', err)
    alert('Error al crear la categoría')
  }
}

async function handleRowUpdate(rowId: string, newLabel: string) {
  if (!props.isAdmin) return
  const row = props.config.rows.find(r => r.id === rowId)
  if (!row) return
  
  const items = props.itemsByRow.get(rowId) || []
  if (items.length > 0) {
    const confirmMsg = `La categoría "${row.label}" tiene ${items.length} tarea(s). ¿Está seguro de cambiarla a "${newLabel}"?`
    if (!confirm(confirmMsg)) return
  }
  
  try {
    const authStore = useAuthStore()
    const res = await fetch(`${API_URL}/rows/${rowId}`, {
      method: 'PUT',
      headers: authHeaders(authStore.token),
      body: JSON.stringify({ label: newLabel })
    })
    if (!res.ok) throw new Error('Failed to update row')
    const updatedRow = await res.json()
    emit('update:config', {
      ...props.config,
      rows: props.config.rows.map(r => r.id === rowId ? updatedRow : r)
    })
  } catch (err) {
    console.error('Error updating row:', err)
    alert('Error al actualizar la categoría')
  }
}

async function handleRowDelete(rowId: string) {
  try {
    const authStore = useAuthStore()
    const res = await fetch(`${API_URL}/rows/${rowId}`, {
      method: 'DELETE',
      headers: authHeaders(authStore.token)
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || 'No se puede eliminar la categoría')
      return
    }
    emit('update:config', {
      ...props.config,
      rows: props.config.rows.filter(r => r.id !== rowId)
    })
  } catch (err) {
    console.error('Error deleting row:', err)
    alert('Error al eliminar la categoría')
  }
}

async function handleExportExcel() {
  await exportToExcel(props.config, 'gantt-chart')
}

function handleSearch() {
  selectedItemIndex.value = -1
  if (searchQuery.value) {
    searchMode.value = 'text'
  } else {
    searchMode.value = 'all'
  }
}

function navigateItems(direction: 'up' | 'down' | 'left' | 'right') {
  if (filteredItems.value.length === 0) return
  
  if (selectedItemIndex.value === -1) {
    selectedItemIndex.value = 0
    return
  }
  
  const currentItem = filteredItems.value[selectedItemIndex.value]
  const currentRowIndex = props.config.rows.findIndex(r => r.id === currentItem.rowId)
  
  if (direction === 'up' && currentRowIndex > 0) {
    const newRowId = props.config.rows[currentRowIndex - 1].id
    const itemsInRow = filteredItems.value.filter(i => i.rowId === newRowId)
    if (itemsInRow.length > 0) {
      const closestItem = itemsInRow.reduce((closest, item) => {
        return Math.abs(item.time.start - currentItem.time.start) < Math.abs(closest.time.start - currentItem.time.start) ? item : closest
      })
      selectedItemIndex.value = filteredItems.value.indexOf(closestItem)
    }
  } else if (direction === 'down' && currentRowIndex < props.config.rows.length - 1) {
    const newRowId = props.config.rows[currentRowIndex + 1].id
    const itemsInRow = filteredItems.value.filter(i => i.rowId === newRowId)
    if (itemsInRow.length > 0) {
      const closestItem = itemsInRow.reduce((closest, item) => {
        return Math.abs(item.time.start - currentItem.time.start) < Math.abs(closest.time.start - currentItem.time.start) ? item : closest
      })
      selectedItemIndex.value = filteredItems.value.indexOf(closestItem)
    }
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (modalOpen.value) return
  
  switch (e.key.toLowerCase()) {
    case 'n':
      e.preventDefault()
      openCreateModal()
      break
    case 'e':
      if (selectedItemIndex.value >= 0) {
        e.preventDefault()
        openEditModal(filteredItems.value[selectedItemIndex.value])
      }
      break
    case 'delete':
    case 'backspace':
      if (selectedItemIndex.value >= 0) {
        e.preventDefault()
        const item = filteredItems.value[selectedItemIndex.value]
        if (item && (props.isAdmin || item.createdBy === props.currentUser?.id)) {
          deleteItem(item.id)
          selectedItemIndex.value = Math.min(selectedItemIndex.value, filteredItems.value.length - 1)
        }
      }
      break
    case 'f':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const searchInput = document.querySelector('.gantt-search-input') as HTMLInputElement
        searchInput?.focus()
      }
      break
    case 'arrowup':
      e.preventDefault()
      navigateItems('up')
      break
    case 'arrowdown':
      e.preventDefault()
      navigateItems('down')
      break
    case 'escape':
      selectedItemIndex.value = -1
      searchQuery.value = ''
      searchMode.value = 'all'
      break
  }
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
  initTheme()
  const baseWidth = 2000
  timelineWidth.value = baseWidth * Math.pow(1.5, (zoomLevel.value - 17) / 5)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="gantt-container" @wheel="handleWheel">
    <div class="gantt-header">
      <div class="gantt-list-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>
        </svg>
        <span>Categorías</span>
      </div>
      <div class="gantt-timeline-header" :style="{ width: timelineWidth + 'px' }">
        <div class="gantt-header-controls">
          <div class="gantt-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              class="gantt-search-input"
              v-model="searchQuery"
              @input="handleSearch"
              placeholder="Buscar tareas... (Ctrl+F)"
            />
          </div>
          <button 
             class="add-btn" 
             @click="openCreateModal" 
             title="Agregar Tarea (N)"
           >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Nueva</span>
          </button>
          <button class="export-btn" @click="handleExportExcel" title="Exportar a Excel/CSV">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Exportar</span>
          </button>
          <div class="gantt-filter-tags">
            <span class="filter-tag" :class="{ active: searchMode === 'all' }" @click="searchMode = 'all'; searchQuery = ''">
              Todos ({{ config.items.length }})
            </span>
            <span class="filter-tag" :class="{ active: searchMode === 'progress' }" @click="searchMode = 'progress'; searchQuery = ''">
              En Progreso
            </span>
            <span class="filter-tag" :class="{ active: searchMode === 'completed' }" @click="searchMode = 'completed'; searchQuery = ''">
              Completadas
            </span>
          </div>
          <div class="gantt-actions">
            <button class="theme-toggle" @click="toggleTheme" title="Cambiar Tema">
              <svg v-if="currentTheme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
            <div class="shortcuts-hint" title="Atajos de teclado">
              <span class="shortcut-key">N</span> Nueva
              <span class="shortcut-key">E</span> Editar
              <span class="shortcut-key">Del</span> Eliminar
            </div>
          </div>
        </div>
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
        :current-user="currentUser"
        :is-admin="isAdmin"
        :selected-item-index="selectedItemIndex"
        :on-scroll="handleScroll"
        :on-item-move="handleItemMove"
        :on-item-resize="handleItemResize"
        :on-item-edit="openEditModal"
        :on-item-delete="deleteItem"
        :on-row-create="handleRowCreate"
        :on-row-update="handleRowUpdate"
        :on-row-delete="handleRowDelete"
        :on-item-select="(index: number) => selectedItemIndex = index"
        @item-rename="handleItemRename"
      />
      <GanttTimeline
        ref="timelineRef"
        :items="filteredItems"
        :items-by-row="itemsByRow"
        :row-map="rowMap"
        :rows="config.rows"
        :timeline-start="timelineStart"
        :timeline-end="timelineEnd"
        :timeline-width="timelineWidth"
        :scroll-left="scrollLeft"
        :current-user="currentUser"
        :is-admin="isAdmin"
        :can-modify="canModifyItem"
        :on-scroll="handleScroll"
        :on-item-move="handleItemMove"
        :on-item-resize="handleItemResize"
        :on-item-edit="openEditModal"
        :on-item-delete="deleteItem"
        :on-item-select="(index: number) => selectedItemIndex = index"
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
          v-for="item in filteredItems"
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
      <button class="zoom-btn" @click="zoomOut" title="Reducir zoom">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
      </button>
      <span class="zoom-label">{{ zoomLevel }}%</span>
      <button class="zoom-btn" @click="zoomIn" title="Aumentar zoom">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
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
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--gantt-bg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transition: all 0.3s ease;
  max-width: 100%;
  position: relative;
}

.gantt-header {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  background: var(--gantt-header-bg);
  overflow: hidden;
}

.gantt-list-header {
  width: 200px;
  min-width: 200px;
  padding: 12px 12px;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.gantt-list-header svg {
  color: var(--text-accent);
  flex-shrink: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: var(--bg-item-start);
  border-radius: 8px;
  cursor: pointer;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.add-btn:hover {
  background: var(--bg-item-end);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.add-btn:active {
  transform: translateY(0) scale(0.97);
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.export-btn:hover {
  background: var(--bg-hover);
  border-color: var(--text-accent);
  color: var(--text-accent);
  transform: translateY(-1px);
}

.export-btn:active {
  transform: translateY(0) scale(0.97);
}

.gantt-timeline-header {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--gantt-header-bg);
}

.gantt-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-hover);
}

.gantt-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  flex: 1;
  max-width: 240px;
}

.gantt-search:focus-within {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.gantt-search svg {
  color: var(--text-muted);
  flex-shrink: 0;
}

.gantt-search-input {
  background: none;
  border: none;
  color: var(--text-primary);
  outline: none;
  font-size: 13px;
  width: 100%;
}

.gantt-search-input::placeholder {
  color: var(--text-dimmed);
}

.gantt-filter-tags {
  display: flex;
  gap: 4px;
}

.filter-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.filter-tag:hover {
  background: rgba(99, 102, 241, 0.15);
  color: var(--text-primary);
}

.filter-tag.active {
  background: rgba(99, 102, 241, 0.2);
  color: var(--text-accent);
  border-color: var(--text-accent);
}

.gantt-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.theme-toggle {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-tertiary);
  cursor: pointer;
}

.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-accent);
  border-color: var(--text-accent);
  transform: scale(1.05);
}

.shortcuts-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-dimmed);
  padding: 4px 8px;
  background: var(--bg-hover);
  border-radius: 4px;
}

.shortcut-key {
  background: var(--border-secondary);
  color: var(--text-secondary);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  font-family: monospace;
}

.gantt-dates-row {
  display: flex;
  height: 50px;
  align-items: center;
}

.gantt-date-cell {
  min-width: 200px;
  padding: 8px 12px;
  text-align: center;
  border-right: 1px solid var(--border-primary);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gantt-date-main {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  letter-spacing: 0.5px;
}

.gantt-date-sub {
  font-size: 10px;
  color: var(--text-dimmed);
}

.gantt-body {
  display: flex;
  flex: 1;
  overflow: auto;
  position: relative;
}

@media (max-width: 1024px) {
  .gantt-container {
    height: 450px;
    border-radius: 8px;
  }

  .gantt-list-header {
    width: 150px;
    min-width: 150px;
    padding: 10px 12px;
  }

  .gantt-date-cell {
    min-width: 150px;
  }

  .export-btn span {
    display: none;
  }

  .export-btn {
    padding: 6px 8px;
  }

  .gantt-minimap {
    width: 160px;
    height: 60px;
    bottom: 55px;
    right: 12px;
  }

  .gantt-header-controls {
    flex-wrap: wrap;
    gap: 8px;
  }

  .shortcuts-hint {
    display: none;
  }
}

@media (max-width: 768px) {
  .gantt-container {
    height: 400px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .gantt-header {
    flex-direction: column;
  }

  .gantt-list-header {
    width: 100%;
    min-width: 100%;
    padding: 8px 12px;
    border-right: none;
    border-bottom: 1px solid var(--border-primary);
  }

  .gantt-timeline-header {
    height: 50px;
    width: auto !important;
    min-width: 0 !important;
    overflow-x: auto;
  }

  .gantt-body {
    flex-direction: column;
    overflow: auto;
  }

  .gantt-list {
    width: 100%;
    min-width: 100%;
    max-height: 120px;
    border-right: none;
    border-bottom: 1px solid var(--border-primary);
    overflow-y: auto;
  }

  .gantt-timeline {
    flex: 1;
    min-width: 600px;
  }

  .gantt-minimap {
    display: none;
  }

  .gantt-header-controls {
    padding: 8px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .zoom-btn {
    width: 32px;
    height: 32px;
  }

  .gantt-search {
    max-width: 100%;
  }

  .shortcuts-hint {
    display: none;
  }
}

@media (max-width: 480px) {
  .gantt-container {
    height: 350px;
  }

  .gantt-list-header {
    padding: 6px 10px;
  }

  .gantt-list-header span {
    display: none;
  }

  .add-btn, .export-btn {
    width: 24px;
    height: 24px;
    padding: 4px;
  }

  .add-btn svg, .export-btn svg {
    width: 14px;
    height: 14px;
  }

  .gantt-date-cell {
    min-width: 100px;
    padding: 4px 8px;
  }

  .gantt-date-main {
    font-size: 11px;
  }

  .gantt-date-sub {
    display: none;
  }

  .gantt-controls {
    padding: 6px;
    gap: 8px;
  }

  .zoom-label {
    font-size: 11px;
    min-width: 60px;
  }
}
</style>