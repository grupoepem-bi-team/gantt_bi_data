<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import LoginForm from '@/components/LoginForm.vue'
import UserSelector from '@/components/UserSelector.vue'
import AdminSidebar from '@/components/AdminSidebar.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import GanttChart from '@/components/GanttChart.vue'
import CalendarView from '@/components/CalendarView.vue'
import CalendarModal from '@/components/CalendarModal.vue'
import type { GanttConfig, GanttItem, GanttRow } from '@/types/gantt'

const API_URL = '/api'

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`
  }
  return headers
}

const authStore = useAuthStore()
const showAdminSidebar = ref(false)
const showChangePasswordModal = ref(false)
const showCalendarModal = ref(false)
const showUserMenu = ref(false)
const calendarViewMode = ref(false)
const selectedCalendarDate = ref<Date | null>(null)
const isLoading = ref(true)

const config = ref<GanttConfig>({
  rows: [],
  items: [],
  columns: [
    { id: 'label', label: 'Tarea', data: 'label', width: 200, header: { content: 'Nombre de Tarea' } },
  ],
  startDate: new Date(Date.now() - 86400000 * 7),
  endDate: new Date(Date.now() + 86400000 * 14),
})

function mapApiItem(apiItem: any): GanttItem {
  let timeStart: number
  let timeEnd: number
  
  if (typeof apiItem.time_start === 'string') {
    timeStart = new Date(apiItem.time_start).getTime()
    timeEnd = new Date(apiItem.time_end).getTime()
  } else {
    timeStart = Number(apiItem.time_start)
    timeEnd = Number(apiItem.time_end)
  }
  
  return {
    id: apiItem.id,
    label: apiItem.label,
    rowId: apiItem.row_id,
    time: { start: timeStart, end: timeEnd },
    progress: apiItem.progress ?? 0,
    assignedUserId: apiItem.assigned_user_id,
    assignedUserIds: apiItem.assigned_user_ids || (apiItem.assigned_user_id ? [apiItem.assigned_user_id] : []),
    color: apiItem.color,
    createdBy: apiItem.created_by,
  }
}

function mapApiRow(apiRow: any): GanttRow {
  return {
    id: apiRow.id,
    label: apiRow.label,
  }
}

async function loadData() {
  isLoading.value = true
  try {
    const [rowsRes, itemsRes] = await Promise.all([
      fetch(`${API_URL}/rows`, { headers: apiHeaders() }),
      fetch(`${API_URL}/items`, { headers: apiHeaders() }),
    ])
    
    if (rowsRes.status === 401) { authStore.logout(); return }
    if (itemsRes.status === 401) { authStore.logout(); return }
    
    if (rowsRes.ok) {
      const rowsData = await rowsRes.json()
      const rowsList = Array.isArray(rowsData) ? rowsData : (rowsData.data || [])
      config.value.rows = rowsList.map(mapApiRow)
    }
    
    if (itemsRes.ok) {
      const itemsData = await itemsRes.json()
      const itemsList = itemsData.data || itemsData
      config.value.items = itemsList.map(mapApiItem)
    }
    
    if (config.value.items.length > 0) {
      const minTime = Math.min(...config.value.items.map(i => i.time.start))
      const maxTime = Math.max(...config.value.items.map(i => i.time.end))
      config.value.startDate = new Date(minTime - 86400000 * 3)
      config.value.endDate = new Date(maxTime + 86400000 * 3)
    }
  } catch (e) {
    console.error('Error loading data:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await authStore.initFromStorage()
  if (authStore.isAuthenticated) {
    await loadData()
  }
})

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    loadData()
  }
})

watch(() => authStore.mustChangePassword, (needsChange) => {
  if (needsChange && authStore.isAuthenticated) {
    showChangePasswordModal.value = true
  }
})

function handleLoginSuccess() {
  if (authStore.mustChangePassword) {
    showChangePasswordModal.value = true
  }
  loadData()
}

function handlePasswordChanged() {
  showChangePasswordModal.value = false
}

async function saveItemToApi(item: GanttItem): Promise<GanttItem | null> {
  try {
    const body = {
      label: item.label,
      row_id: item.rowId,
      time_start: new Date(item.time.start).toISOString(),
      time_end: new Date(item.time.end).toISOString(),
      progress: item.progress || 0,
      assigned_user_id: item.assignedUserId || null,
      assigned_user_ids: item.assignedUserIds || (item.assignedUserId ? [item.assignedUserId] : []),
      created_by: item.createdBy || authStore.user?.id || null,
    }
    
    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      const apiItem = await response.json()
      return mapApiItem(apiItem)
    } else {
      const err = await response.json()
      console.error('Error creating item:', err)
    }
    return null
  } catch (e) {
    console.error('Error saving item:', e)
    return null
  }
}

async function updateItemInApi(item: GanttItem): Promise<GanttItem | null> {
  try {
    const body: any = {
      label: item.label,
      row_id: item.rowId,
      time_start: new Date(item.time.start).toISOString(),
      time_end: new Date(item.time.end).toISOString(),
      progress: item.progress,
      assigned_user_ids: item.assignedUserIds || [],
    }
    if (item.assignedUserId) {
      body.assigned_user_id = item.assignedUserId
    }
    
    const response = await fetch(`${API_URL}/items/${item.id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      const apiItem = await response.json()
      return mapApiItem(apiItem)
    }
    return null
  } catch (e) {
    console.error('Error updating item:', e)
    return null
  }
}

async function deleteItemFromApi(itemId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/items/${itemId}`, { method: 'DELETE', headers: apiHeaders() })
    if (response.status === 401) { authStore.logout(); return false }
    return response.ok
  } catch (e) {
    console.error('Error deleting item:', e)
    return false
  }
}

async function handleConfigUpdate(newConfig: GanttConfig) {
  const oldItems = config.value.items
  config.value = newConfig
  
  const newItems = newConfig.items
  
  const oldIds = new Set(oldItems.map(i => i.id))
  const newIds = new Set(newItems.map(i => i.id))
  
  for (const item of newItems) {
    if (!oldIds.has(item.id)) {
      const saved = await saveItemToApi(item)
      if (saved) {
        const idx = config.value.items.findIndex(i => i.id === item.id)
        if (idx !== -1) {
          config.value.items[idx] = saved
        }
      }
      authStore.addLog('CREAR', `Creo tarea: ${item.label}`, item.id, item.label)
    } else {
      const oldItem = oldItems.find(i => i.id === item.id)
      if (oldItem && (oldItem.label !== item.label || oldItem.rowId !== item.rowId || 
          oldItem.time.start !== item.time.start || oldItem.time.end !== item.time.end ||
          oldItem.progress !== item.progress || oldItem.assignedUserId !== item.assignedUserId ||
          JSON.stringify(oldItem.assignedUserIds || []) !== JSON.stringify(item.assignedUserIds || []))) {
        await updateItemInApi(item)
        authStore.addLog('MODIFICAR', `Modifico tarea: ${item.label}`, item.id, item.label)
      }
    }
  }
  
  for (const oldItem of oldItems) {
    if (!newIds.has(oldItem.id)) {
      await deleteItemFromApi(oldItem.id)
      authStore.addLog('ELIMINAR', `Elimino tarea: ${oldItem.label}`, oldItem.id, oldItem.label)
    }
  }
}

function toggleCalendarView() {
  calendarViewMode.value = !calendarViewMode.value
}

function handleLogout() {
  showUserMenu.value = false
  authStore.logout()
}

function openCalendarModal(date?: Date) {
  selectedCalendarDate.value = date || null
  showCalendarModal.value = true
}

async function handleCalendarSave(item: any) {
  const saved = await saveItemToApi(item)
  const finalItem = saved || item
  config.value.items = [...config.value.items, finalItem]
  authStore.addLog('CREAR', `Creo tarea: ${finalItem.label}`, finalItem.id, finalItem.label)
  showCalendarModal.value = false
}

function handleViewTask(_item: any) {
  // placeholder for future view task functionality
}
</script>

<template>
  <div class="app">
    <LoginForm 
      v-if="!authStore.isAuthenticated" 
      @login-success="handleLoginSuccess" 
    />
    
    <template v-else>
      <ChangePasswordModal 
        v-if="showChangePasswordModal"
        @close="handlePasswordChanged"
      />
      
      <header class="header">
        <img src="./assets/Logo_Grupo_Epem.png" alt="Grupo Epem" class="logo" />
        <div class="title-group">
          <h1>BI Gantt EPEM</h1>
          <p class="subtitle">
            <template v-if="authStore.isAdmin">
              Administrador - Crear, editar, eliminar y asignar tareas
            </template>
            <template v-else>
              Puedes crear y gestionar tus propias tareas
            </template>
          </p>
        </div>
        <div class="header-actions">
          <button 
            class="calendar-toggle-btn"
            :class="{ active: calendarViewMode }"
            @click="toggleCalendarView"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Calendario
          </button>
          <button 
            v-if="authStore.isAdmin" 
            class="admin-btn"
            @click="showAdminSidebar = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Usuarios
          </button>
          <UserSelector v-if="authStore.isAdmin" />
          <button class="user-profile-btn" @click="showUserMenu = !showUserMenu">
            <span class="user-avatar-sm" :style="{ background: authStore.user!.color }">{{ authStore.user!.avatar }}</span>
          </button>
          <Teleport to="body">
            <div v-if="showUserMenu" class="user-menu-overlay" @click="showUserMenu = false"></div>
            <div v-if="showUserMenu" class="user-menu-dropdown">
              <div class="user-menu-header">
                <span class="user-avatar-md" :style="{ background: authStore.user!.color }">{{ authStore.user!.avatar }}</span>
                <div class="user-menu-info">
                  <span class="user-menu-name">{{ authStore.user!.nombre }}</span>
                  <span class="user-menu-email">{{ authStore.user!.email }}</span>
                  <span class="user-menu-rol" :style="{ color: authStore.user!.color }">{{ authStore.user!.rol }}</span>
                </div>
              </div>
              <div class="user-menu-divider"></div>
              <button class="user-menu-item logout" @click="handleLogout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </Teleport>
        </div>
      </header>
       
       <GanttChart
        v-if="!calendarViewMode"
        :config="config" 
        :current-user="authStore.user!"
        :is-admin="authStore.isAdmin"
        @update:config="handleConfigUpdate" 
      />
      
      <CalendarView 
        v-else
        :items="config.items"
        :rows="config.rows"
        :current-user="authStore.user"
        :is-admin="authStore.isAdmin"
        @create-task="openCalendarModal"
        @view-task="handleViewTask"
      />
      
      <CalendarModal
        v-if="showCalendarModal"
        :is-open="showCalendarModal"
        :rows="config.rows"
        :preselected-date="selectedCalendarDate"
        @close="showCalendarModal = false"
        @save="handleCalendarSave"
      />
      
      <AdminSidebar 
        v-if="showAdminSidebar" 
        @close="showAdminSidebar = false" 
      />
    </template>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-secondary);
  color: var(--text-primary);
  min-height: 100vh;
}

.app {
  padding: 32px;
  min-height: 100vh;
  background: var(--bg-primary);
  max-width: 100vw;
  overflow-x: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  max-width: 100%;
}

.logo {
  height: 50px;
  width: auto;
  flex-shrink: 0;
}

.title-group {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.title-group h1 {
  color: var(--text-primary);
  font-weight: 300;
  font-size: 28px;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 400;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.admin-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, var(--bg-admin) 0%, var(--bg-admin-end) 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.admin-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.calendar-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.calendar-toggle-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
  color: #6366f1;
}

@media (max-width: 1024px) {
  .app {
    padding: 24px;
  }

  .logo {
    height: 40px;
  }

  .title-group h1 {
    font-size: 24px;
  }

  .subtitle {
    font-size: 13px;
  }

  .calendar-toggle-btn span,
  .admin-btn span {
    display: none;
  }

  .calendar-toggle-btn,
  .admin-btn {
    padding: 8px;
  }
}

@media (max-width: 768px) {
  .app {
    padding: 16px;
  }

  .header {
    gap: 8px;
    margin-bottom: 12px;
  }

  .logo {
    height: 36px;
  }

  .title-group {
    flex: 1;
    min-width: 120px;
  }

  .title-group h1 {
    font-size: 20px;
  }

  .subtitle {
    display: none;
  }

  .header-actions {
    margin-left: 0;
    gap: 6px;
    width: 100%;
    justify-content: flex-end;
  }

  .calendar-toggle-btn,
  .admin-btn {
    padding: 6px;
    font-size: 0;
  }

  .calendar-toggle-btn span,
  .admin-btn span {
    display: none;
  }
}

@media (max-width: 480px) {
  .app {
    padding: 12px;
  }

  .header {
    gap: 6px;
    margin-bottom: 10px;
  }

  .logo {
    height: 32px;
  }

  .title-group h1 {
    font-size: 16px;
  }

  .header-actions {
    gap: 4px;
  }
}

.user-profile-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--border-primary);
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s;
}

.user-profile-btn:hover {
  border-color: var(--border-focus);
  transform: scale(1.05);
}

.user-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.user-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2100;
}

.user-menu-dropdown {
  position: fixed;
  top: 70px;
  right: 10px;
  width: min(280px, calc(100vw - 20px));
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card-end) 100%);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  padding: 8px;
  z-index: 2101;
  box-shadow: var(--shadow-lg);
}

.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.user-avatar-md {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-menu-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-menu-name {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 13px;
}

.user-menu-email {
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-rol {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.user-menu-divider {
  height: 1px;
  background: var(--border-secondary);
  margin: 4px 0;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-secondary);
  font-size: 13px;
}

.user-menu-item.logout:hover span {
  color: #f87171;
}

.user-menu-item.logout:hover {
  background: rgba(239, 68, 68, 0.15);
}

.user-menu-item.logout svg {
  color: #f87171;
}
</style>