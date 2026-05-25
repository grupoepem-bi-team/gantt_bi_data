<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import type { Usuario } from '@/types/gantt'

const authStore = useAuthStore()
const showDropdown = ref(false)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function selectUser(user: Usuario) {
  authStore.switchUser(user.id)
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
      <span class="user-avatar">{{ authStore.user.avatar }}</span>
      <span class="user-name">{{ authStore.user.nombre }}</span>
      <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="showDropdown" class="dropdown-overlay" @click="closeDropdown"></div>
      <div v-if="showDropdown" class="user-dropdown">
        <div class="dropdown-header">
          <span class="user-avatar-lg">{{ authStore.user.avatar }}</span>
          <div class="user-info">
            <span class="user-nombre">{{ authStore.user.nombre }}</span>
            <span class="user-email">{{ authStore.user.email }}</span>
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
            @click="selectUser(user)"
          >
            <span class="item-avatar">{{ user.avatar }}</span>
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
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

.user-avatar {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.user-name {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.dropdown-icon {
  color: rgba(255, 255, 255, 0.6);
}

.user-dropdown {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 280px;
  background: linear-gradient(180deg, #1e1e2e 0%, #2a2a3e 100%);
  border: 1px solid #3a3a5a;
  border-radius: 12px;
  padding: 8px;
  z-index: 1001;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
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
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-nombre {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.user-email {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.dropdown-divider {
  height: 1px;
  background: #3a3a5a;
  margin: 8px 0;
}

.dropdown-section {
  padding: 4px 0;
}

.section-label {
  display: block;
  color: rgba(255, 255, 255, 0.4);
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
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.dropdown-item:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #fff;
}

.dropdown-item.active {
  background: rgba(99, 102, 241, 0.3);
}

.dropdown-item.logout {
  color: #f87171;
}

.dropdown-item.logout:hover {
  background: rgba(239, 68, 68, 0.2);
}

.item-avatar {
  width: 28px;
  height: 28px;
  background: #3a3a5a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
}

.dropdown-item.active .item-avatar {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

.item-name {
  flex: 1;
  text-align: left;
}

.check-icon {
  color: #22c55e;
}

.logout svg {
  color: #f87171;
}
</style>