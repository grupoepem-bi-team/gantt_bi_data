<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import LoginForm from '@/components/LoginForm.vue'
import UserSelector from '@/components/UserSelector.vue'
import GanttChart from '@/components/GanttChart.vue'
import type { GanttConfig } from '@/types/gantt'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initFromStorage()
})

const config = ref<GanttConfig>({
  rows: [
    { id: '1', label: 'Investigación' },
    { id: '2', label: 'Desarrollo' },
    { id: '3', label: 'Pruebas' },
    { id: '4', label: 'Despliegue' },
    { id: '5', label: 'Documentación' },
    { id: '6', label: 'Revisión' },
  ],
  items: [
    {
      id: '1',
      label: 'Investigación Inicial',
      rowId: '1',
      time: { start: Date.now() - 86400000 * 5, end: Date.now() - 86400000 * 2 },
      progress: 100,
      assignedUserId: '1'
    },
    {
      id: '2',
      label: 'Análisis de Usuarios',
      rowId: '1',
      time: { start: Date.now() - 86400000 * 3, end: Date.now() },
      progress: 75,
      assignedUserId: '2'
    },
    {
      id: '3',
      label: 'API Backend',
      rowId: '2',
      time: { start: Date.now() - 86400000 * 2, end: Date.now() + 86400000 * 3 },
      progress: 60,
      assignedUserId: '1'
    },
    {
      id: '4',
      label: 'Frontend UI',
      rowId: '2',
      time: { start: Date.now(), end: Date.now() + 86400000 * 5 },
      progress: 30,
      assignedUserId: '3'
    },
    {
      id: '5',
      label: 'Pruebas Unitarias',
      rowId: '3',
      time: { start: Date.now() + 86400000 * 2, end: Date.now() + 86400000 * 6 },
      progress: 0,
      assignedUserId: '4'
    },
    {
      id: '6',
      label: 'Pruebas de Integración',
      rowId: '3',
      time: { start: Date.now() + 86400000 * 5, end: Date.now() + 86400000 * 8 },
      progress: 0,
      assignedUserId: '4'
    },
    {
      id: '7',
      label: 'Despliegue a Producción',
      rowId: '4',
      time: { start: Date.now() + 86400000 * 7, end: Date.now() + 86400000 * 9 },
      progress: 0,
      assignedUserId: '5'
    },
    {
      id: '8',
      label: 'Escribir Documentación',
      rowId: '5',
      time: { start: Date.now() + 86400000, end: Date.now() + 86400000 * 6 },
      progress: 15,
      assignedUserId: '2'
    },
    {
      id: '9',
      label: 'Revisión Final',
      rowId: '6',
      time: { start: Date.now() + 86400000 * 8, end: Date.now() + 86400000 * 10 },
      progress: 0,
      assignedUserId: '1'
    },
  ],
  columns: [
    { id: 'label', label: 'Tarea', data: 'label', width: 200, header: { content: 'Nombre de Tarea' } },
  ],
  startDate: new Date(Date.now() - 86400000 * 7),
  endDate: new Date(Date.now() + 86400000 * 14),
})

function handleConfigUpdate(newConfig: GanttConfig) {
  config.value = newConfig
}

function handleLoginSuccess() {
  // Login successful, authStore handles the rest
}
</script>

<template>
  <div class="app">
    <LoginForm v-if="!authStore.isAuthenticated" @login-success="handleLoginSuccess" />
    
    <template v-else>
      <header class="header">
        <img src="./assets/Logo_Grupo_Epem.png" alt="Grupo Epem" class="logo" />
        <div class="title-group">
          <h1>Vue Gantt Chart</h1>
          <p class="subtitle">Arrastra para mover, redimensiona desde los bordes, doble clic para editar, + para agregar</p>
        </div>
        <div class="header-actions">
          <UserSelector />
        </div>
      </header>
      <GanttChart :config="config" :current-user="authStore.user!" @update:config="handleConfigUpdate" />
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
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
}

.app {
  padding: 32px;
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.logo {
  height: 50px;
  width: auto;
}

.title-group {
  flex: 1;
}

.title-group h1 {
  color: #fff;
  font-weight: 300;
  font-size: 28px;
  letter-spacing: 1px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 400;
  margin-top: 4px;
}

.header-actions {
  margin-left: auto;
}
</style>