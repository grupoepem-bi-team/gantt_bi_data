<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GanttItem } from '@/types/gantt'
import { date } from '@/utils/date'

interface Props {
  item?: GanttItem
  rows: Array<{ id: string; label: string }>
  isOpen: boolean
}

const props = withDefaults(defineProps<Props>(), {
  item: undefined
})

const emit = defineEmits(['close', 'save'])

const formData = ref({
  id: '',
  label: '',
  rowId: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  progress: 0
})

const isEditing = computed(() => !!props.item)

function initForm() {
  if (props.item) {
    const start = new Date(props.item.time.start)
    const end = new Date(props.item.time.end)
    formData.value = {
      id: props.item.id,
      label: props.item.label,
      rowId: props.item.rowId,
      startDate: start.toISOString().split('T')[0],
      startTime: start.toTimeString().slice(0, 5),
      endDate: end.toISOString().split('T')[0],
      endTime: end.toTimeString().slice(0, 5),
      progress: props.item.progress || 0
    }
  } else {
    const now = new Date()
    const later = new Date(now.getTime() + 86400000)
    formData.value = {
      id: Date.now().toString(),
      label: '',
      rowId: props.rows[0]?.id || '',
      startDate: now.toISOString().split('T')[0],
      startTime: '09:00',
      endDate: later.toISOString().split('T')[0],
      endTime: '17:00',
      progress: 0
    }
  }
}

function handleSave() {
  const startDateTime = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
  const endDateTime = new Date(`${formData.value.endDate}T${formData.value.endTime}`)

  emit('save', {
    id: formData.value.id,
    label: formData.value.label,
    rowId: formData.value.rowId,
    time: {
      start: startDateTime.getTime(),
      end: endDateTime.getTime()
    },
    progress: formData.value.progress
  })

  emit('close')
}

function handleClose() {
  emit('close')
}

function formatDateDisplay(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}`)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + timeStr
}

defineExpose({ initForm })
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Task' : 'New Task' }}</h2>
          <button class="modal-close" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="label">Task Name</label>
            <input
              id="label"
              v-model="formData.label"
              type="text"
              placeholder="Enter task name..."
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="row">Assign to Row</label>
            <select id="row" v-model="formData.rowId" class="form-input">
              <option v-for="row in rows" :key="row.id" :value="row.id">
                {{ row.label }}
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Start Date</label>
              <input v-model="formData.startDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Start Time</label>
              <input v-model="formData.startTime" type="time" class="form-input" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>End Date</label>
              <input v-model="formData.endDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>End Time</label>
              <input v-model="formData.endTime" type="time" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label>Progress: {{ formData.progress }}%</label>
            <input
              v-model="formData.progress"
              type="range"
              min="0"
              max="100"
              step="5"
              class="form-range"
            />
            <div class="progress-preview">
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" :style="{ width: formData.progress + '%' }"></div>
              </div>
              <span>{{ formData.progress }}%</span>
            </div>
          </div>

          <div class="date-preview">
            <div class="preview-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ formatDateDisplay(formData.startDate, formData.startTime) }}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            <div class="preview-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {{ formatDateDisplay(formData.endDate, formData.endTime) }}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="handleClose">Cancel</button>
          <button class="btn btn-primary" @click="handleSave" :disabled="!formData.label">
            {{ isEditing ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
  border: 1px solid #3a3a5a;
  border-radius: 16px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #3a3a5a;
}

.modal-header h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: #a0a0c0;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  color: #fff;
  background: #3a3a5a;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: #0f0f1a;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.form-input::placeholder {
  color: #666;
}

select.form-input {
  cursor: pointer;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-range {
  width: 100%;
  height: 6px;
  background: #3a3a5a;
  border-radius: 3px;
  cursor: pointer;
  -webkit-appearance: none;
}

.form-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.progress-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.progress-bar-bg {
  flex: 1;
  height: 6px;
  background: #3a3a5a;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e 0%, #4ade80 100%);
  transition: width 0.3s;
}

.progress-preview span {
  color: #4ade80;
  font-size: 12px;
  font-weight: 600;
  min-width: 40px;
}

.date-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  margin-top: 20px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.preview-item svg {
  color: #6366f1;
}

.arrow-icon {
  color: #6366f1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #3a3a5a;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #3a3a5a;
  color: #a0a0c0;
}

.btn-secondary:hover {
  background: #4a4a6a;
  color: #fff;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>