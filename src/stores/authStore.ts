import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Usuario } from '@/types/gantt'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Usuario | null>(null)
  const token = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value && !!token.value)

  const usuariosDisponibles = ref<Usuario[]>([
    { id: '1', nombre: 'Juan Pérez', email: 'juan.perez@epem.com', avatar: 'JP' },
    { id: '2', nombre: 'María García', email: 'maria.garcia@epem.com', avatar: 'MG' },
    { id: '3', nombre: 'Carlos Rodríguez', email: 'carlos.rodriguez@epem.com', avatar: 'CR' },
    { id: '4', nombre: 'Ana Martínez', email: 'ana.martinez@epem.com', avatar: 'AM' },
    { id: '5', nombre: 'Pedro Sánchez', email: 'pedro.sanchez@epem.com', avatar: 'PS' },
  ])

  function login(email: string, password: string): boolean {
    const usuarioEncontrado = usuariosDisponibles.value.find(u => u.email === email)
    
    if (usuarioEncontrado && password.length >= 4) {
      user.value = usuarioEncontrado
      token.value = `token_${Date.now()}_${usuarioEncontrado.id}`
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('gantt_user', JSON.stringify(usuarioEncontrado))
        localStorage.setItem('gantt_token', token.value)
      }
      
      return true
    }
    
    return false
  }

  function logout() {
    user.value = null
    token.value = null
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gantt_user')
      localStorage.removeItem('gantt_token')
    }
  }

  function switchUser(userId: string) {
    const usuario = usuariosDisponibles.value.find(u => u.id === userId)
    if (usuario) {
      user.value = usuario
      token.value = `token_${Date.now()}_${usuario.id}`
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('gantt_user', JSON.stringify(usuario))
        localStorage.setItem('gantt_token', token.value)
      }
    }
  }

  function initFromStorage() {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('gantt_user')
      const storedToken = localStorage.getItem('gantt_token')
      
      if (storedUser && storedToken) {
        try {
          user.value = JSON.parse(storedUser)
          token.value = storedToken
        } catch {
          logout()
        }
      }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    usuariosDisponibles,
    login,
    logout,
    switchUser,
    initFromStorage
  }
})