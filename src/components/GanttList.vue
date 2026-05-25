<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GanttItem, GanttRow, GanttColumn, Usuario } from '@/types/gantt'

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
const ROW_HEIGHT = 40

const rowsArray = computed(() => [...props.rowMap.values()])

function getCellData(column: GanttColumn, row: GanttRow): unknown {
  if (typeof column.data === 'function') {
    return column.data(row)
  }
  return row[column.data as string]
}

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

function getRowItems(rowId: string): GanttItem[] {
  return props.itemsByRow.get(rowId) || []
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  props.onScroll(target.scrollLeft)
}

function getDateLabel(timestamp: number): string {
  return date(timestamp).format('DD MMM')
}
</script>

<template>
  <div class="gantt-list" ref="timelineRef" @scroll="handleScroll">
    <table class="gantt-list-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.id"
            :style="{ width: col.width + 'px' }"
          >
            {{ col.header?.content || col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td
            v-for="col in columns"
            :key="col.id"
            :style="{ width: col.width + 'px' }"
          >
            <div class="cell-content">
              <span v-if="col.id === 'name'" class="item-label">{{ getCellData(col, row) }}</span>
              <span v-else>{{ getCellData(col, row) }}</span>
              <div v-if="col.id === 'name' && getRowItems(row.id).length > 0" class="item-actions">
                <button class="item-action-btn" @click.stop="props.onItemEdit?.(getRowItems(row.id)[0])" title="Edit">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="item-action-btn delete" @click.stop="props.onItemDelete?.(getRowItems(row.id)[0].id)" title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.gantt-list {
  width: 200px;
  min-width: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid #2a2a4a;
  background: #12121f;
}

.gantt-list-table {
  width: 100%;
  border-collapse: collapse;
}

.gantt-list-table th,
.gantt-list-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #1f1f3a;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 40px;
  color: #e0e0e0;
  font-size: 13px;
}

.gantt-list-table th {
  background: #1a1a2e;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid #2a2a4a;
}

.gantt-list-table tbody tr {
  transition: background 0.15s;
}

.gantt-list-table tbody tr:hover {
  background: #1f1f3a;
}

.gantt-list-table tbody tr:hover td {
  color: #fff;
}

.gantt-list-table tbody tr:hover .item-actions {
  opacity: 1;
}

.cell-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.item-action-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: #2a2a4a;
  border-radius: 4px;
  cursor: pointer;
  color: #a0a0c0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.item-action-btn:hover {
  background: #3a3a5a;
  color: #fff;
}

.item-action-btn.delete:hover {
  background: #dc2626;
  color: #fff;
}
</style>