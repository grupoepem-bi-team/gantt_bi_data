<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { GanttItem, GanttRow } from '@/types/gantt'
import { useAuthStore } from '@/stores/authStore'
import dayjs from 'dayjs'

interface Props {
  isOpen: boolean
  rows: GanttRow[]
  preselectedDate?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  preselectedDate: null
})

const emit = defineEmits(['close', 'save'])

const authStore = useAuthStore()

const formData = ref({
  label: '',
  rowId: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '17:00',
  progress: 0,
  assignedUserIds: [] as string[]
})

const userSearch = ref('')
const errors = ref<{ label?: string; rowId?: string }>({})

const isEditing = computed(() => false)

const filteredUsers = computed(() => {
  if (!userSearch.value.trim()) return authStore.usuariosDisponibles || []
  const q = userSearch.value.toLowerCase()
  return (authStore.usuariosDisponibles || []).filter(u =>
    u.nombre.toLowerCase().includes(q)
  )
})

const selectedUsersData = computed(() => {
  const users = authStore.usuariosDisponibles || authStore.usuarios || []
  return formData.value.assignedUserIds
    .map(id => users.find(u => u.id === id))
    .filter(Boolean) as Array<{ id: string; nombre: string; color?: string; rol: string }>
})

const durationDays = computed(() => {
  if (!formData.value.startDate || !formData.value.endDate) return 0
  const start = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
  const end = new Date(`${formData.value.endDate}T${formData.value.endTime}`)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
})

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.preselectedDate) {
      const d = dayjs(props.preselectedDate)
      formData.value.startDate = d.format('YYYY-MM-DD')
      formData.value.endDate = d.add(1, 'day').format('YYYY-MM-DD')
    } else {
      const today = dayjs()
      formData.value.startDate = today.format('YYYY-MM-DD')
      formData.value.endDate = today.add(1, 'day').format('YYYY-MM-DD')
    }
    formData.value.label = ''
    formData.value.rowId = ''
    formData.value.startTime = '09:00'
    formData.value.endTime = '17:00'
    formData.value.progress = 0
    formData.value.assignedUserIds = []
    errors.value = {}
    userSearch.value = ''
  }
})

function toggleUser(userId: string) {
  const idx = formData.value.assignedUserIds.indexOf(userId)
  if (idx >= 0) {
    formData.value.assignedUserIds.splice(idx, 1)
  } else {
    formData.value.assignedUserIds.push(userId)
  }
}

function removeUser(userId: string) {
  formData.value.assignedUserIds = formData.value.assignedUserIds.filter(id => id !== userId)
}

function validate(): boolean {
  errors.value = {}
  if (!formData.value.label.trim()) errors.value.label = 'El nombre es requerido'
  if (!formData.value.rowId) errors.value.rowId = 'Selecciona una categoria'
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validate()) return

  const startDateTime = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
  const endDateTime = new Date(`${formData.value.endDate}T${formData.value.endTime}`)

  const item: GanttItem = {
    id: crypto.randomUUID(),
    label: formData.value.label,
    rowId: formData.value.rowId,
    time: {
      start: startDateTime.getTime(),
      end: endDateTime.getTime()
    },
    assignedUserIds: formData.value.assignedUserIds,
    assignedUserId: formData.value.assignedUserIds[0] || undefined,
    createdBy: authStore.user?.id,
  }
  if (formData.value.progress > 0) {
    item.progress = formData.value.progress
  }
  emit('save', item)
  emit('close')
}

function handleClose() {
  emit('close')
}

function formatDateDisplay(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}`)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + timeStr
}

function formatDuration(): string {
  const days = durationDays.value
  return days === 1 ? '1 dia' : `${days} dias`
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <h2>Nueva Tarea</h2>
          </div>
          <div class="modal-actions-head">
            <button class="btn-cancel" @click="handleClose">Cancelar</button>
            <button class="btn-save" @click="handleSubmit" :disabled="!formData.label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Crear Tarea
            </button>
          </div>
        </div>

        <div class="modal-body">
          <div class="panel-left">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Datos de la tarea
            </div>
            <div class="form-group">
              <label>Nombre de Tarea</label>
              <input v-model="formData.label" type="text" placeholder="Escribe el nombre de la tarea..." class="form-input" :class="{ error: errors.label }" />
              <span v-if="errors.label" class="error-text">{{ errors.label }}</span>
            </div>
            <div class="form-group">
              <label>Categoría</label>
              <select v-model="formData.rowId" class="form-input" :class="{ error: errors.rowId }">
                <option value="">Seleccionar...</option>
                <option v-for="row in rows" :key="row.id" :value="row.id">{{ row.label }}</option>
              </select>
              <span v-if="errors.rowId" class="error-text">{{ errors.rowId }}</span>
            </div>
          </div>

          <div class="panel-center">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Asignar a Usuarios
            </div>
            <div v-if="selectedUsersData.length > 0" class="user-chips">
              <span v-for="user in selectedUsersData" :key="user.id" class="user-chip">
                <span class="chip-avatar" :style="{ background: user.color || '#6366f1' }">{{ user.nombre.substring(0, 2).toUpperCase() }}</span>
                <span class="chip-name">{{ user.nombre }}</span>
                <button class="chip-remove" @click="removeUser(user.id)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </span>
            </div>
            <div class="user-search" v-if="authStore.isAdmin">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input v-model="userSearch" type="text" placeholder="Buscar usuario..." class="search-input" />
            </div>
            <div class="user-grid">
              <div
                v-for="user in filteredUsers"
                :key="user.id"
                class="user-card"
                :class="{ selected: formData.assignedUserIds.includes(user.id) }"
                @click="toggleUser(user.id)"
              >
                <span class="card-check" :class="{ checked: formData.assignedUserIds.includes(user.id) }">
                  <svg v-if="formData.assignedUserIds.includes(user.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span class="card-avatar" :style="{ background: user.color || '#6366f1' }">{{ user.nombre.substring(0, 2).toUpperCase() }}</span>
                <div class="card-info">
                  <span class="card-name">{{ user.nombre }}</span>
                  <span class="card-role">{{ user.rol }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-right">
            <div class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Planificación
            </div>
            <div class="plan-row">
              <div class="plan-field">
                <label>Fecha Inicio</label>
                <input v-model="formData.startDate" type="date" class="form-input" />
              </div>
              <div class="plan-field">
                <label>Hora Inicio</label>
                <input v-model="formData.startTime" type="time" class="form-input" />
              </div>
            </div>
            <div class="plan-row">
              <div class="plan-field">
                <label>Fecha Fin</label>
                <input v-model="formData.endDate" type="date" class="form-input" />
              </div>
              <div class="plan-field">
                <label>Hora Fin</label>
                <input v-model="formData.endTime" type="time" class="form-input" />
              </div>
            </div>
            <div class="range-summary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div>
                <span class="range-dates">{{ formatDateDisplay(formData.startDate, formData.startTime) }} → {{ formatDateDisplay(formData.endDate, formData.endTime) }}</span>
                <span class="range-duration">{{ formatDuration() }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>Progreso: {{ formData.progress }}%</label>
              <input v-model="formData.progress" type="range" min="0" max="100" step="5" class="form-range" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(17, 24, 39, 0.62);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 28px;
}

.modal {
  width: min(1320px, calc(100vw - 56px));
  height: min(840px, calc(100vh - 56px));
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.34);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title svg {
  color: #5b4cf6;
}

.modal-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.modal-actions-head {
  display: flex;
  gap: 10px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #687386;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: #f1f5f9;
  color: #111827;
  border-color: #cbd5e1;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #5b4cf6;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(91, 76, 246, 0.3);
}

.btn-save:hover:not(:disabled) {
  background: #4938e8;
  box-shadow: 0 4px 16px rgba(91, 76, 246, 0.4);
  transform: translateY(-1px);
}

.btn-save:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel-left,
.panel-center,
.panel-right {
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

.panel-left {
  width: 300px;
  min-width: 300px;
  border-right: 1px solid #e2e8f0;
}

.panel-center {
  flex: 1;
  border-right: 1px solid #e2e8f0;
}

.panel-right {
  width: 320px;
  min-width: 320px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #687386;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.section-title svg {
  color: #5b4cf6;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #111827;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.15s;
}

.form-input:focus {
  outline: none;
  border-color: #5b4cf6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(91, 76, 246, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-input.error {
  border-color: #ef4444;
}

.error-text {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

select.form-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23687386' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 34px;
}

.user-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  min-height: 32px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 4px;
  border-radius: 20px;
  background: #f0eeff;
  border: 1px solid rgba(91, 76, 246, 0.2);
}

.chip-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
}

.chip-name {
  font-size: 12px;
  font-weight: 500;
  color: #5b4cf6;
}

.chip-remove {
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(91, 76, 246, 0.15);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5b4cf6;
  transition: all 0.15s;
  padding: 0;
}

.chip-remove:hover {
  background: #ef4444;
  color: #fff;
}

.user-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  margin-bottom: 12px;
  transition: all 0.15s;
}

.user-search:focus-within {
  border-color: #5b4cf6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(91, 76, 246, 0.1);
}

.user-search svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  height: 36px;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 13px;
  outline: none;
}

.search-input::placeholder {
  color: #9ca3af;
}

.user-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  align-content: start;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid #f1f5f9;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.15s;
}

.user-card:hover {
  border-color: #c7d2fe;
  background: #f0eeff;
}

.user-card.selected {
  border-color: #5b4cf6;
  background: #f0eeff;
}

.card-check {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
  color: #fff;
}

.card-check.checked {
  background: #5b4cf6;
  border-color: #5b4cf6;
}

.card-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.card-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-role {
  font-size: 11px;
  color: #687386;
  font-weight: 500;
}

.plan-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.plan-field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #687386;
  margin-bottom: 4px;
}

.range-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
}

.range-summary svg {
  color: #5b4cf6;
  flex-shrink: 0;
}

.range-dates {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.range-duration {
  display: block;
  font-size: 11px;
  color: #687386;
  margin-top: 2px;
}

.form-range {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
  margin-top: 6px;
}

.form-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: #5b4cf6;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(91, 76, 246, 0.3);
}

@media (max-width: 1024px) {
  .modal-body {
    flex-direction: column;
    overflow-y: auto;
  }
  .panel-left,
  .panel-center,
  .panel-right {
    width: 100% !important;
    min-width: unset !important;
    border-right: none !important;
    border-bottom: 1px solid #e2e8f0;
  }
  .panel-center {
    flex: unset;
  }
  .user-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 12px;
  }
  .modal {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
    max-height: none;
  }
  .modal-header {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .modal-actions-head {
    width: 100%;
    justify-content: flex-end;
  }
  .plan-row {
    grid-template-columns: 1fr;
  }
  .user-grid {
    grid-template-columns: 1fr;
  }
  .user-chips {
    flex-wrap: wrap;
  }
  .btn-save, .btn-cancel {
    padding: 8px 16px;
    font-size: 13px;
  }
}
</style>