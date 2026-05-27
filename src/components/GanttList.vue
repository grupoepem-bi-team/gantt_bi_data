<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { GanttRow, GanttColumn, Usuario } from '@/types/gantt'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  rows: GanttRow[]
  columns: GanttColumn[]
  rowMap: Map<string, GanttRow>
  itemsByRow: Map<string, GanttItem[]>
  timelineStart: number
  timelineEnd: number
  timelineWidth: number
  scrollLeft: number
  currentUser?: Usuario
  isAdmin?: boolean
  onScroll: (scrollLeft: number) => void
  onItemMove: (itemId: string, newRowId: string, newStart: number, newEnd: number) => void
  onItemResize: (itemId: string, newStart: number, newEnd: number) => void
  onItemEdit?: (item: GanttItem) => void
  onItemDelete?: (itemId: string) => void
  onRowCreate?: () => void
  onRowUpdate?: (rowId: string, newLabel: string) => void
  onRowDelete?: (rowId: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  isAdmin: false,
  onItemEdit: undefined,
  onItemDelete: undefined,
  onRowCreate: undefined,
  onRowUpdate: undefined,
  onRowDelete: undefined
})

const emit = defineEmits([])

const authStore = useAuthStore()

const ROW_HEIGHT = 44
const timelineRef = ref<HTMLElement | null>(null)

const editingRowId = ref<string | null>(null)
const editingRowValue = ref('')

function startRowRename(row: GanttRow) {
  if (!props.isAdmin) return
  editingRowId.value = row.id
  editingRowValue.value = row.label
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('.row-rename-input')
    input?.focus()
    input?.select()
  })
}

function confirmRowRename() {
  if (!editingRowId.value) return
  const newLabel = editingRowValue.value.trim()
  if (newLabel) {
    props.onRowUpdate?.(editingRowId.value, newLabel)
  }
  editingRowId.value = null
}

function cancelRowRename() {
  editingRowId.value = null
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  props.onScroll(target.scrollLeft)
}

function handleRowDelete(row: GanttRow) {
  const items = props.itemsByRow.get(row.id) || []
  if (items.length > 0) {
    alert(`No se puede eliminar la categoría "${row.label}" porque tiene ${items.length} tarea(s) asignada(s).`)
    return
  }
  if (confirm(`¿Eliminar la categoría "${row.label}"?`)) {
    props.onRowDelete?.(row.id)
  }
}
</script>

<template>
  <div class="gantt-list" ref="timelineRef" @scroll="handleScroll">
    <table class="gantt-list-table">
      <thead>
        <tr>
          <th class="col-tasks">Categorías</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" class="gantt-row-tr">
          <td class="cell-tasks">
            <template v-if="editingRowId === row.id">
              <div class="row-edit-row">
                <input
                  v-model="editingRowValue"
                  class="row-rename-input"
                  @keyup.enter="confirmRowRename"
                  @keyup.escape="cancelRowRename"
                  @blur="confirmRowRename"
                  @click.stop
                />
                <button class="row-save-btn" @click.stop="confirmRowRename" title="Guardar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="row-cancel-btn" @click.stop="cancelRowRename" title="Cancelar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </template>
            <template v-else>
              <div class="row-label-row">
                <span class="row-label">{{ row.label }}</span>
                <div v-if="isAdmin" class="row-actions">
                  <button class="row-action-btn edit" @click.stop="startRowRename(row)" title="Renombrar categoría">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="row-action-btn delete" @click.stop="handleRowDelete(row)" title="Eliminar categoría">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.gantt-list {
  width: 260px;
  min-width: 260px;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid var(--border-primary);
  background: var(--bg-list);
}

.gantt-list-table {
  width: 100%;
  border-collapse: collapse;
}

.gantt-list-table th {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-primary);
  text-align: left;
  background: var(--bg-secondary);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  position: sticky;
  top: 0;
  z-index: 1;
}

.gantt-row-tr {
  border-bottom: 1px solid var(--border-primary);
}

.cell-tasks {
  padding: 0;
  vertical-align: middle;
  border-bottom: 1px solid var(--border-primary);
  height: 44px;
  color: var(--text-secondary);
}

.row-label-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 44px;
}

.row-label {
  font-weight: 600;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-edit-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  height: 44px;
}

.row-rename-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-focus);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  outline: none;
  padding: 4px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.row-save-btn,
.row-cancel-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.row-save-btn {
  background: #10b981;
  color: #fff;
}

.row-save-btn:hover {
  background: #059669;
  transform: scale(1.05);
}

.row-cancel-btn {
  background: var(--border-primary);
  color: var(--text-tertiary);
}

.row-cancel-btn:hover {
  background: #ef4444;
  color: #fff;
  transform: scale(1.05);
}

.row-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.row-label-row:hover .row-actions {
  opacity: 1;
}

.row-action-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.row-action-btn:hover {
  transform: scale(1.08);
  border-color: transparent;
}

.row-action-btn.edit:hover {
  background: var(--bg-item-start);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.row-action-btn.delete:hover {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}
</style>