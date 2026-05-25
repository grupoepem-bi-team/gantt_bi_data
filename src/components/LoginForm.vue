<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const emit = defineEmits(['login-success'])

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

function handleSubmit() {
  error.value = ''
  
  if (!email.value) {
    error.value = 'El email es requerido'
    return
  }
  
  if (!password.value) {
    error.value = 'La contraseña es requerida'
    return
  }
  
  isLoading.value = true
  
  setTimeout(() => {
    const success = authStore.login(email.value, password.value)
    
    if (success) {
      emit('login-success')
    } else {
      error.value = 'Credenciales inválidas. Use cualquier email de la lista y contraseña de 4+ caracteres.'
    }
    
    isLoading.value = false
  }, 500)
}

function selectQuickUser(userEmail: string) {
  email.value = userEmail
  password.value = '1234'
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img src="./assets/Logo_Grupo_Epem.png" alt="Grupo Epem" class="logo" />
        <h1>Vue Gantt Chart</h1>
        <p>Inicia sesión para continuar</p>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="correo@epem.com"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="login-btn" :disabled="isLoading">
          <span v-if="isLoading">Iniciando sesión...</span>
          <span v-else>Iniciar Sesión</span>
        </button>
      </form>

      <div class="quick-users">
        <p class="quick-label">Usuarios de prueba (clic rápido):</p>
        <div class="user-chips">
          <button
            v-for="user in authStore.usuariosDisponibles"
            :key="user.id"
            class="user-chip"
            @click="selectQuickUser(user.email)"
            type="button"
          >
            <span class="user-avatar">{{ user.avatar }}</span>
            <span class="user-name">{{ user.nombre }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 20px;
}

.login-card {
  background: linear-gradient(180deg, #1e1e2e 0%, #2a2a3e 100%);
  border: 1px solid #3a3a5a;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header .logo {
  height: 60px;
  margin-bottom: 16px;
}

.login-header h1 {
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.login-header p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 500;
}

.form-group input {
  padding: 14px 16px;
  background: #0f0f1a;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.form-group input::placeholder {
  color: #666;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #dc2626;
  border-radius: 8px;
  padding: 12px;
  color: #f87171;
  font-size: 13px;
  text-align: center;
}

.login-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-users {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #3a3a5a;
}

.quick-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 12px;
  text-align: center;
}

.user-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #2a2a4a;
  border: 1px solid #3a3a5a;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-chip:hover {
  background: #3a3a5a;
  border-color: #6366f1;
}

.user-avatar {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
}

.user-name {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}
</style>