<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const showDropdown = ref(false)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function selectUser(userId: string) {
  authStore.switchUser(userId)
  showDropdown.value = false
}

function handleLogout() {
  authStore.logout()
}

function closeDropdown() {
  showDropdown.value = false
}
</script>

<template>
  <div class="user-selector" v-if="authStore.user">
    <button class="user-button" @click="toggleDropdown">
      <span class="user-avatar" :style="{ background: authStore.user.color }">{{ authStore.user.avatar }}</span>
      <span class="user-name">{{ authStore.user.nombre }}</span>
      <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="showDropdown" class="dropdown-overlay" @click="closeDropdown"></div>
      <div v-if="showDropdown" class="user-dropdown">
        <div class="dropdown-header">
          <span class="user-avatar-lg" :style="{ background: authStore.user.color }">{{ authStore.user.avatar }}</span>
          <div class="user-info">
            <span class="user-nombre">{{ authStore.user.nombre }}</span>
            <span class="user-email">{{ authStore.user.email }}</span>
            <span class="user-rol" :style="{ color: authStore.user.color }">{{ authStore.user.rol }}</span>
          </div>
        </div>

        <div class="dropdown-divider"></div>

        <div class="dropdown-section">
          <span class="section-label">Cambiar de usuario</span>
          <button
            v-for="user in authStore.usuariosDisponibles"
            :key="user.id"
            class="dropdown-item"
            :class="{ active: user.id === authStore.user?.id }"
            @click="selectUser(user.id)"
          >
            <span class="item-avatar" :style="{ background: user.color }">{{ user.avatar }}</span>
            <span class="item-name">{{ user.nombre }}</span>
            <svg v-if="user.id === authStore.user?.id" class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>

        <div class="dropdown-divider"></div>

        <button class="dropdown-item logout" @click="handleLogout">
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
</template>

<style scoped>
.user-selector {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-button:hover {
  background: var(--bg-hover);
  border-color: var(--border-primary);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-name {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
}

.dropdown-icon {
  color: var(--text-tertiary);
}

.user-dropdown {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 300px;
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card-end) 100%);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  padding: 8px;
  z-index: 1001;
  box-shadow: var(--shadow-lg);
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.user-avatar-lg {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-nombre {
  color: var(--text-primary);
  font-weight: 600;
}

.user-email {
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-rol {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.dropdown-divider {
  height: 1px;
  background: var(--border-secondary);
  margin: 8px 0;
}

.dropdown-section {
  padding: 4px 0;
}

.section-label {
  display: block;
  color: var(--text-dimmed);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 12px 4px;
}

.dropdown-item {
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
}

.dropdown-item.logout:hover span {
  color: #f87171;
}

.dropdown-item:hover {
  background: rgba(99, 102, 241, 0.2);
  color: var(--text-primary);
}

.dropdown-item.logout:hover {
  background: rgba(239, 68, 68, 0.2);
}

.item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  color: #22c55e;
  flex-shrink: 0;
}

.logout svg {
  color: #f87171;
}
</style>