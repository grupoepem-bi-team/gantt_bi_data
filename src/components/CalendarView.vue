<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

const currentDate = ref(new Date())
const viewMode = ref<'month' | 'week' | 'day'>('month')
const selectedDate = ref<Date | null>(null)

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const monthName = computed(() => {
  return currentDate.value.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
})

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay()
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
  const day = startOfWeek.getDay()
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
    currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() - 7))
  } else {
    const dayNum = selectedDate.value ? selectedDate.value.getDate() - 1 : currentDate.value.getDate() - 1
    currentDate.value = new Date(currentYear.value, currentMonth.value, dayNum)
  }
}

function next() {
  if (viewMode.value === 'month') {
    currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
  } else if (viewMode.value === 'week') {
    currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() + 7))
  } else {
    const dayNum = selectedDate.value ? selectedDate.value.getDate() + 1 : currentDate.value.getDate() + 1
    currentDate.value = new Date(currentYear.value, currentMonth.value, dayNum)
  }
}

function goToToday() {
  currentDate.value = new Date()
}

function selectDay(day: { date: Date; items: GanttItem[] }) {
  if (viewMode.value === 'day') {
    selectedDate.value = day.date
  } else {
    selectedDate.value = day.date
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
</script>

<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <div class="calendar-nav">
        <button class="nav-btn" @click="previous">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 class="calendar-title">{{ monthName }}</h2>
        <button class="nav-btn" @click="next">
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
            'has-items': day.items.length > 0,
            'selected': selectedDate?.toDateString() === day.date.toDateString()
          }"
          @click="selectDay(day)"
        >
          <span class="day-number">{{ day.date.getDate() }}</span>
          <div v-if="day.items.length > 0" class="day-items">
            <div 
              v-for="item in day.items.slice(0, 3)" 
              :key="item.id"
              class="day-item-dot"
              :style="{ backgroundColor: item.color || '#6366f1' }"
              :title="item.label"
            ></div>
            <span v-if="day.items.length > 3" class="more-items">+{{ day.items.length - 3 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Week View -->
    <div v-if="viewMode === 'week'" class="calendar-week">
      <div class="calendar-week-header">
        <div class="time-gutter"></div>
        <div 
          v-for="day in weekDays" 
          :key="day.date.toISOString()"
          class="week-day-header"
          :class="{ 'today': day.isToday }"
        >
          <span class="week-day-name">{{ daysOfWeek[day.date.getDay()] }}</span>
          <span class="week-day-number">{{ day.date.getDate() }}</span>
        </div>
      </div>
      <div class="calendar-week-body">
        <div class="time-gutter">
          <div v-for="h in 24" :key="h" class="time-slot">{{ h - 1 }}:00</div>
        </div>
        <div 
          v-for="day in weekDays" 
          :key="day.date.toISOString()"
          class="week-day-column"
          :class="{ 'today': day.isToday }"
        >
          <div v-for="h in 24" :key="h" class="hour-slot"></div>
          <div 
            v-for="item in day.items" 
            :key="item.id"
            class="week-item"
            :style="{ backgroundColor: item.color || '#6366f1' }"
            @click="viewTaskItem(item)"
          >
            <span class="week-item-time">{{ formatTime(item.time.start) }}</span>
            <span class="week-item-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Day View -->
    <div v-if="viewMode === 'day'" class="calendar-day-view">
      <div class="day-detail-header">
        <h3>{{ selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) }}</h3>
        <button class="add-btn-small" @click="openCreateModal(selectedDate!)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <div class="day-items-list">
        <div v-if="dayItems.length === 0" class="no-items">
          No hay tareas para este dia
        </div>
        <div 
          v-for="item in dayItems" 
          :key="item.id"
          class="day-item-card"
          @click="viewTaskItem(item)"
        >
          <div class="item-time">
            <span>{{ formatTime(item.time.start) }} - {{ formatTime(item.time.end) }}</span>
            <span v-if="item.progress !== undefined" class="item-progress">{{ item.progress }}%</span>
          </div>
          <div class="item-label">{{ item.label }}</div>
          <div class="item-row">{{ getRowLabel(item.rowId) }}</div>
          <div class="item-progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: (item.progress || 0) + '%', backgroundColor: item.color || '#6366f1' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected day quick view -->
    <div v-if="selectedDate && viewMode !== 'day'" class="selected-day-panel">
      <h4>{{ selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) }}</h4>
      <div v-if="getItemsForDate(selectedDate).length === 0" class="no-items-small">
        Sin tareas
      </div>
      <div 
        v-for="item in getItemsForDate(selectedDate).slice(0, 5)" 
        :key="item.id"
        class="quick-item"
        @click="viewTaskItem(item)"
      >
        <span class="quick-time">{{ formatTime(item.time.start) }}</span>
        <span class="quick-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

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
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.calendar-title {
  font-size: 20px;
  font-weight: 600;
  min-width: 120px;
  text-align: center;
  text-transform: capitalize;
  white-space: nowrap;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-hover);
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
}

.calendar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.today-btn {
  padding: 8px 16px;
  border: none;
  background: rgba(99, 102, 241, 0.2);
  color: var(--text-accent);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.today-btn:hover {
  background: rgba(99, 102, 241, 0.3);
}

.view-switcher {
  display: flex;
  background: var(--bg-hover);
}

.view-switcher button {
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--text-tertiary);
  transition: all 0.2s;
}

.view-switcher button:hover {
  color: var(--text-primary);
}

.add-task-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: var(--bg-item-start);
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.add-task-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

/* Month View */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 8px;
}

.weekday {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  min-height: 80px;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-day:hover {
  background: var(--bg-hover);
}

.calendar-day.other-month {
  opacity: 0.4;
}

.calendar-day.today {
  background: var(--bg-today);
}

.calendar-day.today .day-number {
  background: var(--text-accent);
  color: #ffffff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-day.selected {
  background: var(--bg-today);
  border: 1px solid var(--text-accent);
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.day-items {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.day-item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.more-items {
  font-size: 10px;
  color: var(--text-muted);
}

/* Week View */
.calendar-week-header {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: 0;
}

.time-gutter {
  width: 60px;
  flex-shrink: 0;
}

.week-day-header {
  flex: 1;
  padding: 12px 8px;
  text-align: center;
  border-left: 1px solid var(--border-primary);
}

.week-day-name {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.week-day-number {
  display: block;
  font-size: 18px;
  font-weight: 600;
  margin-top: 4px;
}

.week-day-header.today .week-day-number {
  color: var(--text-accent);
}

.calendar-week-body {
  display: flex;
  max-height: 400px;
  overflow-y: auto;
}

.time-slot {
  height: 30px;
  font-size: 10px;
  color: var(--text-dimmed);
  padding: 4px;
  border-bottom: 1px solid var(--bg-secondary);
}

.week-day-column {
  flex: 1;
  position: relative;
  border-left: 1px solid var(--border-primary);
}

.hour-slot {
  height: 30px;
  border-bottom: 1px solid var(--bg-secondary);
}

.week-item {
  position: absolute;
  left: 2px;
  right: 2px;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: white;
  cursor: pointer;
  overflow: hidden;
  z-index: 1;
}

.week-item-time {
  display: block;
  font-size: 9px;
  opacity: 0.8;
}

.week-item-label {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Day View */
.calendar-day-view {
  padding: 16px;
}

.day-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.day-detail-header h3 {
  font-size: 16px;
  font-weight: 600;
  text-transform: capitalize;
}

.add-btn-small {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--text-accent);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-items {
  text-align: center;
  color: var(--text-muted);
  padding: 40px;
}

.day-item-card {
  background: var(--bg-hover);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.day-item-card:hover {
  background: var(--bg-hover);
  transform: translateX(4px);
}

.item-time {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.item-progress {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 2px 6px;
  border-radius: 4px;
}

.item-label {
  font-weight: 500;
  margin-bottom: 4px;
}

.item-row {
  font-size: 12px;
  color: var(--text-dimmed);
  margin-bottom: 8px;
}

.item-progress-bar {
  height: 4px;
  background: var(--border-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s;
}

/* Selected Day Panel */
.selected-day-panel {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-today);
  border-radius: 8px;
}

.selected-day-panel h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: capitalize;
}

.no-items-small {
  font-size: 12px;
  color: var(--text-dimmed);
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-item:hover {
  background: var(--bg-hover);
}

.quick-time {
  font-size: 11px;
  color: var(--text-muted);
  min-width: 45px;
}

.quick-label {
  font-size: 13px;
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
    min-width: 80px;
  }

  .calendar-actions {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .calendar-day {
    min-height: 60px;
    padding: 4px;
  }

  .day-number {
    font-size: 12px;
  }

  .day-item-dot {
    width: 6px;
    height: 6px;
  }

  .weekday {
    font-size: 10px;
    padding: 4px;
  }

  .add-task-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .add-task-btn span {
    display: none;
  }

  .view-switcher {
    order: -1;
    width: 100%;
    justify-content: center;
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
    min-height: 48px;
    padding: 2px;
  }

  .day-number {
    font-size: 10px;
    margin-bottom: 2px;
  }

  .today-btn {
    padding: 4px 8px;
    font-size: 11px;
  }

  .view-switcher button {
    padding: 4px 10px;
    font-size: 11px;
  }

  .time-gutter {
    width: 40px;
    font-size: 9px;
  }
}

</style>