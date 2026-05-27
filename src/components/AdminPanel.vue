<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const emit = defineEmits(['close'])

const authStore = useAuthStore()

const activeTab = ref<'users' | 'logs'>('users')
const showCreateModal = ref(false)
const editingUser = ref<string | null>(null)
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
    formData.value.password.trim() !== '' &&
    formData.value.password.length >= 4
})

function resetForm() {
  formData.value = { nombre: '', email: '', rol: 'Usuario', password: '' }
  editingUser.value = null
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function closeModal() {
  showCreateModal.value = false
  editingUser.value = null
  resetForm()
}

function editUser(userId: string) {
  const user = authStore.usuariosDisponibles.find(u => u.id === userId)
  if (user) {
    formData.value = {
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      password: user.password || ''
    }
    editingUser.value = userId
    showCreateModal.value = true
  }
}

function saveUser() {
  if (!userFormValid.value) return

  if (editingUser.value) {
    authStore.updateUser(editingUser.value, {
      nombre: formData.value.nombre,
      email: formData.value.email,
      rol: formData.value.rol,
      password: formData.value.password
    })
  } else {
    authStore.createUser({
      nombre: formData.value.nombre,
      email: formData.value.email,
      rol: formData.value.rol,
      password: formData.value.password
    })
  }
  closeModal()
}

function confirmDelete(userId: string) {
  deleteConfirmId.value = userId
}

function cancelDelete() {
  deleteConfirmId.value = null
}

function executeDelete() {
  if (deleteConfirmId.value) {
    authStore.deleteUser(deleteConfirmId.value)
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

function getAccionIcon(accion: string): string {
  const icons: Record<string, string> = {
    CREAR: 'M12 4v16m8-8H4',
    ELIMINAR: 'M6 6l12 12M6 18L18 6',
    ASIGNAR: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    MODIFICAR: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    LOGIN: 'M11 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    LOGOUT: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
  }
  return icons[accion] || 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
}
</script>

<template>
  <div class="admin-overlay" @click.self="emit('close')">
    <div class="admin-panel">
      <div class="panel-header">
        <h2>Panel de Administracion</h2>
        <button class="close-btn" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="panel-tabs">
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
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Registro de Actividad
        </button>
      </div>

      <div class="panel-content">
        <div v-if="activeTab === 'users'" class="users-tab">
          <div class="tab-header">
            <span class="user-count">{{ authStore.usuariosDisponibles.length }} usuarios</span>
            <button class="create-btn" @click="openCreateModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo Usuario
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
              <div class="user-actions">
                <button class="action-btn edit" @click="editUser(user.id)" title="Editar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  v-if="user.id !== authStore.user?.id"
                  class="action-btn delete"
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
        </div>

        <div v-if="activeTab === 'logs'" class="logs-tab">
          <div class="logs-list">
            <div
              v-for="log in authStore.activityLogs"
              :key="log.id"
              class="log-item"
            >
              <div class="log-icon" :style="{ background: getAccionColor(log.accion) }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path :d="getAccionIcon(log.accion)"/>
                </svg>
              </div>
              <div class="log-content">
                <div class="log-header">
                  <span class="log-accion" :style="{ color: getAccionColor(log.accion) }">{{ log.accion }}</span>
                  <span class="log-user">{{ log.usuarioNombre }}</span>
                </div>
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
            <h3>{{ editingUser ? 'Editar Usuario' : 'Crear Usuario' }}</h3>
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
              />
            </div>
            <div class="form-group">
              <label>Usuario</label>
              <input
                v-model="formData.email"
                type="email"
                placeholder="Ej: juan.perez@epem.com"
              />
            </div>
            <div class="form-group">
              <label>Rol</label>
              <select v-model="formData.rol">
                <option value="Admin">Administrador</option>
                <option value="Usuario">Usuario</option>
              </select>
            </div>
            <div class="form-group">
              <label>Contrasena</label>
              <input
                v-model="formData.password"
                type="password"
                placeholder="Minimo 4 caracteres"
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
              {{ editingUser ? 'Guardar Cambios' : 'Crear Usuario' }}
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
.admin-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.admin-panel {
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card-end) 100%);
  border: 1px solid var(--border-secondary);
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-secondary);
}

.panel-header h2 {
  color: var(--text-primary);
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.panel-tabs {
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

.panel-content {
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
  padding: 10px 16px;
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
  opacity: 0.9;
}
</style>