<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const emit = defineEmits(['close'])

const authStore = useAuthStore()

const activeTab = ref<'users' | 'logs'>('users')
const showCreateModal = ref(false)

onMounted(() => {
  authStore.fetchUsers()
  authStore.fetchLogs()
})
const deleteConfirmId = ref<string | null>(null)

const formData = ref({
  nombre: '',
  email: '',
  rol: 'Usuario',
  password: ''
})

const userFormValid = computed(() => {
  return formData.value.nombre.trim() !== '' &&
    formData.value.email.trim() !== '' &&
    formData.value.password.trim().length >= 6
})

function resetForm() {
  formData.value = { nombre: '', email: '', rol: 'Usuario', password: '' }
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function closeModal() {
  showCreateModal.value = false
  resetForm()
}

async function saveUser() {
  if (!userFormValid.value) return

  try {
    await authStore.createUser({
      nombre: formData.value.nombre,
      email: formData.value.email,
      rol: formData.value.rol,
      password: formData.value.password
    })
    closeModal()
  } catch (error) {
    console.error('Error creating user:', error)
  }
}

function confirmDelete(userId: string) {
  deleteConfirmId.value = userId
}

function cancelDelete() {
  deleteConfirmId.value = null
}

async function executeDelete() {
  if (deleteConfirmId.value) {
    await authStore.deleteUser(deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getAccionColor(accion: string): string {
  const colors: Record<string, string> = {
    CREAR: '#22c55e',
    ELIMINAR: '#ef4444',
    ASIGNAR: '#3b82f6',
    MODIFICAR: '#f59e0b',
    LOGIN: '#8b5cf6',
    LOGOUT: '#6b7280'
  }
  return colors[accion] || '#6b7280'
}
</script>

<template>
  <div class="sidebar-overlay" @click.self="emit('close')">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Panel de Administracion</h2>
        <button class="close-btn" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="sidebar-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Usuarios
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'logs' }"
          @click="activeTab = 'logs'"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Registro
        </button>
      </div>

      <div class="sidebar-content">
        <div v-if="activeTab === 'users'" class="users-tab">
          <div class="tab-header">
            <span class="user-count">{{ authStore.usuariosDisponibles.length }} usuarios</span>
            <button class="create-btn" @click="openCreateModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo
            </button>
          </div>

          <div class="users-list">
            <div
              v-for="user in authStore.usuariosDisponibles"
              :key="user.id"
              class="user-item"
            >
              <div class="user-avatar" :style="{ background: user.color }">
                {{ user.avatar }}
              </div>
              <div class="user-info">
                <span class="user-name">{{ user.nombre }}</span>
                <span class="user-email">{{ user.email }}</span>
              </div>
              <span class="user-rol" :class="user.rol.toLowerCase()">{{ user.rol }}</span>
              <button
                v-if="user.id !== authStore.user?.id"
                class="delete-btn"
                @click="confirmDelete(user.id)"
                title="Eliminar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'logs'" class="logs-tab">
          <div class="logs-list">
            <div
              v-for="log in authStore.activityLogs"
              :key="log.id"
              class="log-item"
            >
              <div class="log-icon" :style="{ background: getAccionColor(log.accion) }">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div class="log-content">
                <span class="log-accion" :style="{ color: getAccionColor(log.accion) }">{{ log.accion }}</span>
                <span class="log-user">{{ log.usuarioNombre }}</span>
                <span class="log-descripcion">{{ log.descripcion }}</span>
                <span class="log-fecha">{{ formatDate(log.fecha) }}</span>
              </div>
            </div>
            <div v-if="authStore.activityLogs.length === 0" class="no-logs">
              No hay actividad registrada
            </div>
          </div>
        </div>
      </div>

      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h3>Crear Nuevo Usuario</h3>
            <button class="close-btn" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nombre Completo</label>
              <input
                v-model="formData.nombre"
                type="text"
                placeholder="Ej: Juan Perez"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Usuario</label>
              <input
                v-model="formData.email"
                type="email"
                placeholder="Ej: juan.perez@epem.com"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Rol</label>
              <select v-model="formData.rol" class="form-input">
                <option value="Usuario">Usuario</option>
                <option value="Admin">Administrador</option>
              </select>
            </div>
            <div class="form-group">
              <label>Contrasena Inicial</label>
              <input
                v-model="formData.password"
                type="password"
                placeholder="Minimo 6 caracteres"
                class="form-input"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">Cancelar</button>
            <button
              class="btn-save"
              :disabled="!userFormValid"
              @click="saveUser"
            >
              Crear Usuario
            </button>
          </div>
        </div>
      </div>

      <div v-if="deleteConfirmId" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal confirm-modal">
          <div class="modal-header">
            <h3>Confirmar Eliminacion</h3>
          </div>
          <div class="modal-body">
            <p>Esta seguro de que desea eliminar este usuario? Esta accion no se puede deshacer.</p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="cancelDelete">Cancelar</button>
            <button class="btn-delete" @click="executeDelete">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
}

.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: min(400px, 100%);
  max-width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card-end) 100%);
  border-left: 1px solid var(--border-secondary);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-secondary);
}

.sidebar-header h2 {
  color: var(--text-primary);
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.sidebar-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 24px;
  background: var(--bg-primary);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab-btn.active {
  color: var(--text-primary);
  background: rgba(99, 102, 241, 0.3);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.user-count {
  color: var(--text-muted);
  font-size: 13px;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--text-accent);
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: #5558e3;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.user-email {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.user-rol {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.user-rol.admin {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.user-rol.usuario {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
}

.delete-btn {
  padding: 6px;
  background: none;
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
}

.log-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-accion {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.log-user {
  color: var(--text-muted);
}

.log-descripcion {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 2px;
}

.log-fecha {
  display: block;
  color: var(--text-dimmed);
}

.no-logs {
  text-align: center;
  color: var(--text-dimmed);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 400px;
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card-end) 100%);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-secondary);
}

.modal-header h3 {
  color: var(--text-primary);
  font-weight: 600;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--border-focus);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-secondary);
}

.btn-cancel {
  padding: 10px 16px;
  background: none;
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.btn-save {
  padding: 10px 16px;
  background: var(--text-accent);
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  padding: 10px 16px;
  background: var(--bg-admin);
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.confirm-modal .modal-body p {
  color: var(--text-secondary);
}
</style>