<script setup lang="ts">
import { ref } from 'vue'
import GanttChart from './components/GanttChart.vue'
import type { GanttConfig } from './types/gantt'

const config = ref<GanttConfig>({
  rows: [
    { id: '1', label: 'Research' },
    { id: '2', label: 'Development' },
    { id: '3', label: 'Testing' },
    { id: '4', label: 'Deployment' },
    { id: '5', label: 'Documentation' },
    { id: '6', label: 'Review' },
  ],
  items: [
    {
      id: '1',
      label: 'Initial Research',
      rowId: '1',
      time: { start: Date.now() - 86400000 * 5, end: Date.now() - 86400000 * 2 },
      progress: 100
    },
    {
      id: '2',
      label: 'User Analysis',
      rowId: '1',
      time: { start: Date.now() - 86400000 * 3, end: Date.now() },
      progress: 75
    },
    {
      id: '3',
      label: 'Backend API',
      rowId: '2',
      time: { start: Date.now() - 86400000 * 2, end: Date.now() + 86400000 * 3 },
      progress: 60
    },
    {
      id: '4',
      label: 'Frontend UI',
      rowId: '2',
      time: { start: Date.now(), end: Date.now() + 86400000 * 5 },
      progress: 30
    },
    {
      id: '5',
      label: 'Unit Tests',
      rowId: '3',
      time: { start: Date.now() + 86400000 * 2, end: Date.now() + 86400000 * 6 },
      progress: 0
    },
    {
      id: '6',
      label: 'Integration Tests',
      rowId: '3',
      time: { start: Date.now() + 86400000 * 5, end: Date.now() + 86400000 * 8 },
      progress: 0
    },
    {
      id: '7',
      label: 'Production Deploy',
      rowId: '4',
      time: { start: Date.now() + 86400000 * 7, end: Date.now() + 86400000 * 9 },
      progress: 0
    },
    {
      id: '8',
      label: 'Write Docs',
      rowId: '5',
      time: { start: Date.now() + 86400000, end: Date.now() + 86400000 * 6 },
      progress: 15
    },
    {
      id: '9',
      label: 'Final Review',
      rowId: '6',
      time: { start: Date.now() + 86400000 * 8, end: Date.now() + 86400000 * 10 },
      progress: 0
    },
  ],
  columns: [
    { id: 'label', label: 'Task', data: 'label', width: 200, header: { content: 'Task Name' } },
  ],
  startDate: new Date(Date.now() - 86400000 * 7),
  endDate: new Date(Date.now() + 86400000 * 14),
})

function handleConfigUpdate(newConfig: GanttConfig) {
  config.value = newConfig
}
</script>

<template>
  <div class="app">
    <header class="header">
      <img src="./assets/Logo_Grupo_Epem.png" alt="Grupo Epem" class="logo" />
      <div class="title-group">
        <h1>Vue Gantt Chart</h1>
        <p class="subtitle">Drag to move, resize from edges, double-click to edit, + button to add</p>
      </div>
    </header>
    <GanttChart :config="config" @update:config="handleConfigUpdate" />
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
</style>