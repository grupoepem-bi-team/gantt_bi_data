<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const emit = defineEmits(['login-success'])

const formData = ref({
  usuario: '',
  password: ''
})
const isLoading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!formData.value.usuario || !formData.value.password) {
    error.value = 'Por favor complete todos los campos'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authStore.login(formData.value.usuario, formData.value.password)
    emit('login-success')
  } catch (e: any) {
    error.value = e.message || 'Credenciales invalidas'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img src="../assets/Logo_Grupo_Epem.png" alt="Grupo Epem" class="logo" />
        <h1>BI Gantt EPEM</h1>
        <p>Ingresa tus credenciales para continuar</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="form-group">
          <label for="usuario">Usuario</label>
          <input
            id="usuario"
            v-model="formData.usuario"
            type="text"
            placeholder="Emmanuel Villasanti"
            class="form-input"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password">Contrasena</label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            placeholder="Ingresa tu contrasena"
            class="form-input"
            :disabled="isLoading"
          />
        </div>

        <button type="submit" class="login-btn" :disabled="isLoading">
          {{ isLoading ? 'Iniciando sesion...' : 'Iniciar Sesion' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, #16213e 100%);
  padding: 20px;
}

.login-card {
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-card-end) 100%);
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
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
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 8px;
}

.login-header p {
  color: var(--text-tertiary);
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-message {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: var(--text-secondary);
  font-weight: 500;
}

.form-input {
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.form-input::placeholder {
  color: var(--text-dimmed);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-btn {
  padding: 14px 20px;
  background: linear-gradient(135deg, var(--text-accent) 0%, #8b5cf6 100%);
  border: none;
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>