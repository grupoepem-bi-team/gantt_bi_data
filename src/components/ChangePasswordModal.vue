<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const emit = defineEmits(['close'])

const formData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const isLoading = ref(false)
const error = ref('')

const passwordsMatch = computed(() => {
  return formData.value.newPassword === formData.value.confirmPassword
})

const isPasswordValid = computed(() => {
  return formData.value.newPassword.length >= 6
})

const canSubmit = computed(() => {
  return formData.value.currentPassword &&
    formData.value.newPassword &&
    formData.value.confirmPassword &&
    passwordsMatch.value &&
    isPasswordValid.value
})

async function handleSubmit() {
  if (!canSubmit.value || isLoading.value) return

  isLoading.value = true
  error.value = ''

  try {
    const success = await authStore.changePassword(
      formData.value.currentPassword,
      formData.value.newPassword
    )

    if (success) {
      emit('close')
    } else {
      error.value = 'La contrasena actual es incorrecta'
    }
  } catch (e) {
    error.value = 'Error al cambiar la contrasena'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2>Cambiar Contrasena</h2>
        <p class="subtitle">Debes cambiar tu contrasena antes de continuar</p>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-body">
        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="form-group">
          <label for="current">Contrasena Actual</label>
          <input
            id="current"
            v-model="formData.currentPassword"
            type="password"
            placeholder="Ingresa tu contrasena actual"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="new">Nueva Contrasena</label>
          <input
            id="new"
            v-model="formData.newPassword"
            type="password"
            placeholder="Minimo 6 caracteres"
            class="form-input"
          />
          <span v-if="formData.newPassword && !isPasswordValid" class="field-hint">
            La contrasena debe tener al menos 6 caracteres
          </span>
        </div>

        <div class="form-group">
          <label for="confirm">Confirmar Nueva Contrasena</label>
          <input
            id="confirm"
            v-model="formData.confirmPassword"
            type="password"
            placeholder="Repite la nueva contrasena"
            class="form-input"
          />
          <span v-if="formData.confirmPassword && !passwordsMatch" class="field-hint error">
            Las contrasenas no coinciden
          </span>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="!canSubmit || isLoading">
            {{ isLoading ? 'Guardando...' : 'Guardar y Continuar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.modal {
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-end) 100%);
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-secondary);
  text-align: center;
}

.modal-header h2 {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-tertiary);
  font-size: 14px;
}

.modal-body {
  padding: 24px;
}

.error-message {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-input);
  border-radius: 8px;
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

.field-hint {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 6px;
}

.field-hint.error {
  color: #ef4444;
}

.form-actions {
  margin-top: 24px;
}

.btn-primary {
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, var(--text-accent) 0%, #8b5cf6 100%);
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
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