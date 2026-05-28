<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GanttItem, GanttRow, Usuario } from '@/types/gantt'
import { date } from '@/utils/date'

interface Props {
  items: GanttItem[]
  rows: GanttRow[]
  currentUser?: Usuario
  isAdmin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAdmin: false
})

const emit = defineEmits(['create-task', 'view-task'])

const ROW_PALETTE: Record<string, string> = {
  default: '#6366f1'
}
const PALETTE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const currentDate = ref(new Date())
const viewMode = ref<'month' | 'week' | 'day'>('month')
const selectedDate = ref<Date | null>(null)

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthName = computed(() => {
  return currentDate.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
})

const daysOfWeek = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

const rowColorMap = computed(() => {
  const map: Record<string, string> = {}
  props.rows.forEach((row, i) => {
    map[row.id] = PALETTE_COLORS[i % PALETTE_COLORS.length]
  })
  return map
})

function getItemColor(item: GanttItem): string {
  if (item.color) return item.color
  return rowColorMap.value[item.rowId] || ROW_PALETTE.default
}

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  
  const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; items: GanttItem[] }> = []
  
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: isToday(d),
      items: getItemsForDate(d)
    })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i)
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: isToday(d),
      items: getItemsForDate(d)
    })
  }
  
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: isToday(d),
      items: getItemsForDate(d)
    })
  }
  
  return days
})

const weekDays = computed(() => {
  const startOfWeek = new Date(currentDate.value)
  const day = (startOfWeek.getDay() + 6) % 7
  startOfWeek.setDate(startOfWeek.getDate() - day)
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return {
      date: d,
      isToday: isToday(d),
      items: getItemsForDate(d)
    }
  })
})

const dayItems = computed(() => {
  if (!selectedDate.value) return []
  return getItemsForDate(selectedDate.value)
})

function isToday(d: Date): boolean {
  const today = new Date()
  return d.getDate() === today.getDate() && 
         d.getMonth() === today.getMonth() && 
         d.getFullYear() === today.getFullYear()
}

function getItemsForDate(d: Date): GanttItem[] {
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dayEnd = dayStart + 86400000
  
  return props.items.filter(item => {
    return item.time.start < dayEnd && item.time.end > dayStart
  })
}

function previous() {
  if (viewMode.value === 'month') {
    currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
  } else if (viewMode.value === 'week') {
    const d = new Date(currentDate.value)
    d.setDate(d.getDate() - 7)
    currentDate.value = d
  } else {
    const d = selectedDate.value ? new Date(selectedDate.value) : new Date(currentDate.value)
    d.setDate(d.getDate() - 1)
    selectedDate.value = d
    currentDate.value = new Date(d)
  }
}

function next() {
  if (viewMode.value === 'month') {
    currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
  } else if (viewMode.value === 'week') {
    const d = new Date(currentDate.value)
    d.setDate(d.getDate() + 7)
    currentDate.value = d
  } else {
    const d = selectedDate.value ? new Date(selectedDate.value) : new Date(currentDate.value)
    d.setDate(d.getDate() + 1)
    selectedDate.value = d
    currentDate.value = new Date(d)
  }
}

function goToToday() {
  currentDate.value = new Date()
  selectedDate.value = new Date()
}

function selectDay(day: { date: Date; items: GanttItem[] }) {
  selectedDate.value = day.date
  if (viewMode.value === 'month') {
    viewMode.value = 'day'
  }
}

function selectWeek() {
  viewMode.value = 'week'
  selectedDate.value = null
}

function selectMonth() {
  viewMode.value = 'month'
  selectedDate.value = null
}

function openCreateModal(day?: Date) {
  emit('create-task', day || selectedDate.value || new Date())
}

function viewTaskItem(item: GanttItem) {
  emit('view-task', item)
}

function formatTime(timestamp: number): string {
  return date(timestamp).format('HH:mm')
}

function getRowLabel(rowId: string): string {
  const row = props.rows.find(r => r.id === rowId)
  return row?.label || ''
}

function getItemPosition(item: GanttItem, dayDate: Date): { top: number; height: number } {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime()
  const HOUR_HEIGHT = 48
  const startHour = Math.max(0, (item.time.start - dayStart) / 3600000)
  const endHour = Math.min(24, (item.time.end - dayStart) / 3600000)
  const duration = Math.max(0.5, endHour - startHour)
  return {
    top: startHour * HOUR_HEIGHT,
    height: Math.max(20, duration * HOUR_HEIGHT)
  }
}
</script>

<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <div class="calendar-nav">
        <button class="nav-btn" @click="previous" title="Anterior">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 class="calendar-title">{{ monthName }}</h2>
        <button class="nav-btn" @click="next" title="Siguiente">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      
      <div class="calendar-actions">
        <button class="today-btn" @click="goToToday">Hoy</button>
        <div class="view-switcher">
          <button 
            :class="{ active: viewMode === 'month' }" 
            @click="selectMonth"
          >Mes</button>
          <button 
            :class="{ active: viewMode === 'week' }" 
            @click="selectWeek"
          >Semana</button>
          <button 
            :class="{ active: viewMode === 'day' }" 
            @click="viewMode = 'day'"
          >Dia</button>
        </div>
        <button class="add-task-btn" @click="openCreateModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva Tarea
        </button>
      </div>
    </div>

    <div v-if="rows.length > 0" class="calendar-legend">
      <div v-for="row in rows.slice(0, 6)" :key="row.id" class="legend-item">
        <span class="legend-dot" :style="{ backgroundColor: rowColorMap[row.id] || '#6366f1' }"></span>
        <span class="legend-label">{{ row.label }}</span>
      </div>
    </div>

    <!-- Month View -->
    <div v-if="viewMode === 'month'" class="calendar-month">
      <div class="calendar-weekdays">
        <div v-for="day in daysOfWeek" :key="day" class="weekday">{{ day }}</div>
      </div>
      <div class="calendar-grid">
        <div 
          v-for="(day, index) in calendarDays" 
          :key="index"
          class="calendar-day"
          :class="{ 
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'selected': selectedDate?.toDateString() === day.date.toDateString()
          }"
          @click="selectDay(day)"
          @dblclick="openCreateModal(day.date)"
        >
          <div class="day-header">
            <span class="day-number">{{ day.date.getDate() }}</span>
            <button 
              v-if="day.items.length > 0" 
              class="day-count" 
              :title="`${day.items.length} tarea${day.items.length > 1 ? 's' : ''}`"
            >{{ day.items.length }}</button>
          </div>
          <div v-if="day.items.length > 0" class="day-items">
            <div 
              v-for="item in day.items.slice(0, 3)" 
              :key="item.id"
              class="day-task-pill"
              :style="{ '--task-color': getItemColor(item) }"
              @click.stop="viewTaskItem(item)"
            >
              <span class="task-pill-label">{{ item.label }}</span>
              <span v-if="item.progress !== undefined" class="task-pill-progress" :style="{ width: item.progress + '%' }"></span>
            </div>
            <div v-if="day.items.length > 3" class="day-more" @click.stop="selectDay(day)">
              +{{ day.items.length - 3 }} mas
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Week View -->
    <div v-if="viewMode === 'week'" class="calendar-week">
      <div class="calendar-week-header">
        <div class="time-gutter-all-day">Todo el dia</div>
        <div 
          v-for="day in weekDays" 
          :key="day.date.toISOString()"
          class="week-day-header"
          :class="{ 'today': day.isToday }"
        >
          <span class="week-day-name">{{ daysOfWeek[(day.date.getDay() + 6) % 7] }}</span>
          <span class="week-day-number">{{ day.date.getDate() }}</span>
        </div>
      </div>

      <div v-if="weekDays.some(d => d.items.length > 0)" class="all-day-section">
        <div class="time-gutter-spacer"></div>
        <div 
          v-for="day in weekDays" 
          :key="'allday-' + day.date.toISOString()"
          class="all-day-column"
        >
          <div 
            v-for="item in day.items.filter(i => isAllDay(i, day.date))" 
            :key="item.id"
            class="all-day-pill"
            :style="{ backgroundColor: getItemColor(item) }"
            @click="viewTaskItem(item)"
          >
            {{ item.label }}
          </div>
        </div>
      </div>

      <div class="calendar-week-header-hours">
        <div class="time-gutter-hours"></div>
        <div 
          v-for="day in weekDays" 
          :key="'hours-' + day.date.toISOString()"
          class="week-day-header-h"
          :class="{ 'today': day.isToday }"
        ></div>
      </div>

      <div class="calendar-week-body">
        <div class="time-gutter">
          <div v-for="h in 24" :key="h" class="time-slot">
            <span>{{ String((h - 1) % 24).padStart(2, '0') }}:00</span>
          </div>
        </div>
        <div 
          v-for="day in weekDays" 
          :key="day.date.toISOString()"
          class="week-day-column"
          :class="{ 'today': day.isToday }"
          @dblclick="openCreateModal(day.date)"
        >
          <div v-for="h in 24" :key="h" class="hour-slot"></div>
          <div 
            v-for="item in day.items.filter(i => !isAllDay(i, day.date))" 
            :key="item.id"
            class="week-task-bar"
            :style="{ 
              top: getItemPosition(item, day.date).top + 'px',
              height: getItemPosition(item, day.date).height + 'px',
              '--task-color': getItemColor(item)
            }"
            @click="viewTaskItem(item)"
          >
            <span class="week-task-time">{{ formatTime(item.time.start) }}</span>
            <span class="week-task-label">{{ item.label }}</span>
            <div v-if="item.progress !== undefined" class="week-task-progress">
              <div class="week-task-progress-fill" :style="{ width: item.progress + '%', backgroundColor: getItemColor(item) }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Day View -->
    <div v-if="viewMode === 'day'" class="calendar-day-view">
      <div class="day-detail-header">
        <h3>{{ selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) }}</h3>
        <div class="day-header-actions">
          <button class="day-nav-btn" @click="previous" title="Dia anterior">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="day-nav-btn" @click="next" title="Dia siguiente">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="add-btn-sm" @click="openCreateModal(selectedDate!)" title="Nueva tarea">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="dayItems.length === 0" class="no-tasks">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p>No hay tareas para este dia</p>
        <button class="create-btn" @click="openCreateModal(selectedDate!)">Crear tarea</button>
      </div>

      <div v-else class="day-tasks-list">
        <div 
          v-for="item in dayItems" 
          :key="item.id"
          class="day-task-card"
          :style="{ '--task-color': getItemColor(item) }"
          @click="viewTaskItem(item)"
        >
          <div class="task-card-color-bar"></div>
          <div class="task-card-body">
            <div class="task-card-top">
              <span class="task-card-label">{{ item.label }}</span>
              <span v-if="item.progress !== undefined" class="task-card-badge">{{ item.progress }}%</span>
            </div>
            <div class="task-card-meta">
              <span class="task-card-row">{{ getRowLabel(item.rowId) }}</span>
              <span class="task-card-time">{{ formatTime(item.time.start) }} - {{ formatTime(item.time.end) }}</span>
            </div>
            <div v-if="item.progress !== undefined" class="task-card-progress">
              <div class="task-card-progress-fill" :style="{ width: item.progress + '%', backgroundColor: getItemColor(item) }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function isAllDay(item: GanttItem, dayDate: Date): boolean {
  const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime()
  const dayEnd = dayStart + 86400000
  return item.time.start <= dayStart && item.time.end >= dayEnd
}
</script>

<style scoped>
.calendar-container {
  background: var(--gantt-bg);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 20px;
  color: var(--text-primary);
  min-height: 500px;
  max-width: 100%;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.calendar-title {
  font-size: 20px;
  font-weight: 600;
  min-width: 140px;
  text-align: center;
  text-transform: capitalize;
  white-space: nowrap;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--text-accent);
}

.calendar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.today-btn {
  padding: 7px 14px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s;
}

.today-btn:hover {
  background: var(--bg-hover);
  border-color: var(--text-accent);
}

.view-switcher {
  display: flex;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.view-switcher button {
  padding: 7px 14px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  border-right: 1px solid var(--border-primary);
}

.view-switcher button:last-child {
  border-right: none;
}

.view-switcher button:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.view-switcher button.active {
  background: var(--text-accent);
  color: #fff;
}

.add-task-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  background: var(--bg-item-start);
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s;
}

.add-task-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

/* Legend */
.calendar-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  white-space: nowrap;
}

/* Month View */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 4px;
}

.weekday {
  padding: 8px 4px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.calendar-day {
  min-height: 90px;
  padding: 4px 6px;
  background: var(--gantt-bg);
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.calendar-day:hover {
  background: var(--bg-hover);
}

.calendar-day.other-month {
  opacity: 0.45;
}

.calendar-day.today {
  background: var(--bg-today);
}

.calendar-day.selected {
  background: var(--bg-today);
  box-shadow: inset 0 0 0 2px var(--text-accent);
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.calendar-day.today .day-number {
  background: var(--text-accent);
  color: #fff;
  font-weight: 600;
}

.day-count {
  font-size: 10px;
  background: var(--bg-hover);
  color: var(--text-muted);
  border-radius: 10px;
  padding: 1px 6px;
  border: none;
  cursor: default;
  line-height: 1.4;
}

.day-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.day-task-pill {
  position: relative;
  font-size: 11px;
  line-height: 1.3;
  padding: 1px 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--task-color) 20%, var(--bg-secondary));
  color: var(--task-color);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: background 0.15s;
  overflow: hidden;
}

.day-task-pill:hover {
  background: color-mix(in srgb, var(--task-color) 35%, var(--bg-secondary));
}

.task-pill-label {
  position: relative;
  z-index: 1;
}

.task-pill-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--task-color);
  opacity: 0.6;
  border-radius: 0 0 3px 3px;
  max-width: 100%;
}

.day-more {
  font-size: 10px;
  color: var(--text-muted);
  padding: 0 4px;
  cursor: pointer;
}

.day-more:hover {
  color: var(--text-accent);
}

/* Week View */
.calendar-week-header {
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border-primary);
}

.time-gutter-all-day {
  width: 56px;
  flex-shrink: 0;
  padding: 8px 4px;
  font-size: 10px;
  color: var(--text-dimmed);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.week-day-header {
  flex: 1;
  padding: 8px;
  text-align: center;
  border-left: 1px solid var(--border-primary);
}

.week-day-name {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.week-day-number {
  display: block;
  font-size: 20px;
  font-weight: 600;
  margin-top: 2px;
  color: var(--text-primary);
}

.week-day-header.today .week-day-number {
  color: #fff;
  background: var(--text-accent);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.all-day-section {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  min-height: 28px;
}

.time-gutter-spacer {
  width: 56px;
  flex-shrink: 0;
}

.all-day-column {
  flex: 1;
  border-left: 1px solid var(--border-primary);
  padding: 2px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.all-day-pill {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  font-weight: 500;
}

.all-day-pill:hover {
  filter: brightness(1.15);
}

.calendar-week-header-hours {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
}

.time-gutter-hours {
  width: 56px;
  flex-shrink: 0;
}

.week-day-header-h {
  flex: 1;
  border-left: 1px solid var(--border-primary);
}

.week-day-header-h.today {
  background: rgba(99, 102, 241, 0.05);
}

.calendar-week-body {
  display: flex;
  max-height: 480px;
  overflow-y: auto;
  position: relative;
}

.time-gutter {
  width: 56px;
  flex-shrink: 0;
}

.time-slot {
  height: 48px;
  font-size: 10px;
  color: var(--text-dimmed);
  padding: 2px 4px;
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.time-slot span {
  transform: translateY(-6px);
}

.week-day-column {
  flex: 1;
  position: relative;
  border-left: 1px solid var(--border-primary);
  min-height: 1152px;
}

.week-day-column.today {
  background: rgba(99, 102, 241, 0.03);
}

.hour-slot {
  height: 48px;
  border-bottom: 1px solid var(--border-primary);
}

.week-task-bar {
  position: absolute;
  left: 2px;
  right: 2px;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
  cursor: pointer;
  overflow: hidden;
  z-index: 1;
  background: var(--task-color);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: filter 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.week-task-bar:hover {
  filter: brightness(1.15);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  z-index: 5;
}

.week-task-time {
  font-size: 9px;
  opacity: 0.85;
}

.week-task-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.week-task-progress {
  height: 2px;
  background: rgba(255,255,255,0.3);
  border-radius: 1px;
  margin-top: auto;
  overflow: hidden;
}

.week-task-progress-fill {
  height: 100%;
  border-radius: 1px;
}

/* Day View */
.calendar-day-view {
  padding: 16px;
}

.day-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.day-detail-header h3 {
  font-size: 18px;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--text-primary);
}

.day-header-actions {
  display: flex;
  gap: 6px;
}

.day-nav-btn, .add-btn-sm {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  border-radius: 8px;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.day-nav-btn:hover, .add-btn-sm:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.add-btn-sm {
  background: var(--text-accent);
  color: #fff;
  border-color: var(--text-accent);
}

.no-tasks {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.no-tasks svg {
  margin-bottom: 12px;
}

.no-tasks p {
  font-size: 14px;
  margin-bottom: 16px;
}

.create-btn {
  padding: 8px 16px;
  border: none;
  background: var(--text-accent);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s;
}

.create-btn:hover {
  filter: brightness(1.1);
}

.day-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-task-card {
  display: flex;
  background: var(--bg-secondary);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-primary);
}

.day-task-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: var(--task-color);
}

.task-card-color-bar {
  width: 5px;
  background: var(--task-color);
  flex-shrink: 0;
}

.task-card-body {
  padding: 14px 16px;
  flex: 1;
  min-width: 0;
}

.task-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.task-card-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-card-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: 8px;
}

.task-card-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.task-card-row {
  font-size: 12px;
  color: var(--task-color);
  font-weight: 500;
}

.task-card-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.task-card-progress {
  height: 4px;
  background: var(--border-primary);
  border-radius: 2px;
  overflow: hidden;
}

.task-card-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

@media (max-width: 768px) {
  .calendar-container {
    padding: 12px;
    border-radius: 0;
    border-left: none;
    border-right: none;
    min-height: 400px;
  }

  .calendar-header {
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .calendar-nav {
    gap: 8px;
  }

  .calendar-title {
    font-size: 16px;
    min-width: 100px;
  }

  .calendar-actions {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .calendar-day {
    min-height: 70px;
    padding: 3px;
  }

  .day-number {
    font-size: 12px;
  }

  .day-task-pill {
    font-size: 9px;
    padding: 0 3px;
  }

  .calendar-legend {
    gap: 8px;
  }

  .legend-item {
    font-size: 10px;
  }

  .add-task-btn span {
    display: none;
  }

  .view-switcher {
    order: -1;
    width: 100%;
    justify-content: center;
  }

  .time-gutter {
    width: 40px;
  }

  .time-gutter-all-day, .time-gutter-spacer, .time-gutter-hours {
    width: 40px;
  }

  .time-slot {
    font-size: 9px;
  }

  .week-task-bar {
    font-size: 10px;
    padding: 2px 4px;
  }
}

@media (max-width: 480px) {
  .calendar-container {
    padding: 8px;
    min-height: 350px;
  }

  .calendar-title {
    font-size: 14px;
  }

  .calendar-day {
    min-height: 56px;
    padding: 2px;
  }

  .day-number {
    font-size: 10px;
  }

  .today-btn {
    padding: 4px 8px;
    font-size: 11px;
  }

  .view-switcher button {
    padding: 4px 10px;
    font-size: 11px;
  }

  .task-card-body {
    padding: 10px 12px;
  }
}
</style>