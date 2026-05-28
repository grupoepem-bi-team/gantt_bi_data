import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Usuario } from '@/types/gantt'

interface UsuarioFull extends Usuario {
  rol: string
  debe_cambiar_password: boolean
  fecha_creacion?: string
  ultimo_acceso?: string
}

interface ActividadLog {
  id: string
  usuarioId: string
  usuarioNombre: string
  accion: 'CREAR' | 'ELIMINAR' | 'ASIGNAR' | 'MODIFICAR' | 'LOGIN' | 'LOGOUT'
  descripcion: string
  targetId?: string
  targetNombre?: string
  fecha: string
}

const API_URL = '/api'

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UsuarioFull | null>(null)
  const token = ref<string | null>(null)
  const usuarios = ref<UsuarioFull[]>([])
  const activityLogs = ref<ActividadLog[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const isAdmin = computed(() => user.value?.rol === 'Admin')
  const mustChangePassword = computed(() => user.value?.debe_cambiar_password ?? false)

  const usuariosDisponibles = computed(() => usuarios.value)

  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: authHeaders(token.value)
      })
      if (response.status === 401) {
        logout()
        return
      }
      if (response.ok) {
        const result = await response.json()
        usuarios.value = result.data || result
      }
    } catch (e) {
      console.error('Error fetching users:', e)
    }
  }

  async function fetchLogs() {
    try {
      const response = await fetch(`${API_URL}/logs`, {
        headers: authHeaders(token.value)
      })
      if (response.status === 401) {
        logout()
        return
      }
      if (response.ok) {
        const result = await response.json()
        const logs = result.data || result
        activityLogs.value = logs.map((log: any) => ({
          id: log.id,
          usuarioId: log.usuario_id,
          usuarioNombre: log.usuario_nombre,
          accion: log.accion,
          descripcion: log.descripcion,
          targetId: log.target_id,
          targetNombre: log.target_nombre,
          fecha: log.fecha
        }))
      }
    } catch (e) {
      console.error('Error fetching logs:', e)
    }
  }

  async function login(usuario: string, password: string) {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      })
      
      const text = await response.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {}
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
      const jwt = data.token
      const { token: _, ...userData } = data
      user.value = userData
      token.value = jwt
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('gantt_user', JSON.stringify(userData))
        localStorage.setItem('gantt_token', jwt)
      }
      
      await fetchUsers()
      await fetchLogs()
      
      addLog('LOGIN', `Inicio sesion`)
      
      return data
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user.value) return false
    
    try {
      const response = await fetch(`${API_URL}/users/change-password`, {
        method: 'POST',
        headers: authHeaders(token.value),
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })
      
      if (!response.ok) {
        const text = await response.text()
        let data: any = {}
        try { data = JSON.parse(text) } catch {}
        throw new Error(data.error || 'Failed to change password')
      }
      
      const text = await response.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {}
      
      if (data.token) {
        token.value = data.token
        if (typeof window !== 'undefined') {
          localStorage.setItem('gantt_token', data.token)
        }
      }
      
      user.value.debe_cambiar_password = false
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('gantt_user', JSON.stringify(user.value))
      }
      
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  async function createUser(data: { nombre: string; email: string; rol: string; password: string }) {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: authHeaders(token.value),
        body: JSON.stringify(data)
      })
      
      if (response.status === 401) {
        logout()
        throw new Error('Sesion expirada')
      }
      
      if (!response.ok) {
        const text = await response.text()
        let res: any = {}
        try { res = JSON.parse(text) } catch {}
        throw new Error(res.error || 'Failed to create user')
      }
      
      await fetchUsers()
      addLog('CREAR', `Creo usuario: ${data.nombre}`)
      return true
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function deleteUser(userId: string) {
    try {
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(token.value)
      })
      
      if (response.status === 401) {
        logout()
        throw new Error('Sesion expirada')
      }
      
      if (!response.ok) {
        const text = await response.text()
        let data: any = {}
        try { data = JSON.parse(text) } catch {}
        throw new Error(data.error || 'Failed to delete user')
      }
      
      const deleted = usuarios.value.find(u => u.id === userId)
      usuarios.value = usuarios.value.filter(u => u.id !== userId)
      
      if (deleted) {
        addLog('ELIMINAR', `Elimino usuario: ${deleted.nombre}`, userId, deleted.nombre)
      }
      
      return true
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function assignTask(taskId: string, taskName: string, userId: string) {
    if (!isAdmin.value) return false
    
    const usuario = usuarios.value.find(u => u.id === userId)
    if (!usuario) return false
    
    addLog('ASIGNAR', `Asigno tarea "${taskName}" a ${usuario.nombre}`, userId, taskName)
    return true
  }

  async function resetPassword(userId: string, newPassword: string) {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: authHeaders(token.value),
        body: JSON.stringify({ password: newPassword })
      })

      if (response.status === 401) {
        logout()
        throw new Error('Sesion expirada')
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset password')
      }

      await fetchUsers()
      return true
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  function addLog(accion: ActividadLog['accion'], descripcion: string, targetId?: string, targetNombre?: string) {
    if (!user.value) return
    
    const log: ActividadLog = {
      id: Date.now().toString(36),
      usuarioId: user.value.id,
      usuarioNombre: user.value.nombre,
      accion,
      descripcion,
      targetId,
      targetNombre,
      fecha: new Date().toISOString()
    }
    
    activityLogs.value.unshift(log)
    
    fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: authHeaders(token.value),
      body: JSON.stringify({
        accion,
        descripcion,
        target_id: targetId,
        target_nombre: targetNombre
      })
    }).catch(e => console.error('Error saving log:', e))
  }

  async function refreshToken() {
    if (!user.value || !token.value) return false

    try {
      const response = await fetch(`${API_URL}/users/refresh`, {
        method: 'POST',
        headers: authHeaders(token.value)
      })

      if (!response.ok) {
        return false
      }

      const text = await response.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {}
      
      if (data.token) {
        token.value = data.token

        if (typeof window !== 'undefined') {
          localStorage.setItem('gantt_token', data.token)
        }
      }

      return true
    } catch {
      return false
    }
  }

  function logout() {
    if (user.value) {
      addLog('LOGOUT', `Cerro sesion`)
    }
    
    user.value = null
    token.value = null
    usuarios.value = []
    activityLogs.value = []
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gantt_user')
      localStorage.removeItem('gantt_token')
    }
  }

  async function initFromStorage() {
    if (typeof window === 'undefined') return
    
    const storedUser = localStorage.getItem('gantt_user')
    const storedToken = localStorage.getItem('gantt_token')
    
    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser)
        user.value = parsed
        token.value = storedToken
        
        await fetchUsers()
      } catch {
        logout()
      }
    }
  }

  function switchUser(userId: string) {
    const usuario = usuarios.value.find(u => u.id === userId)
    if (usuario) {
      user.value = usuario
      if (typeof window !== 'undefined') {
        localStorage.setItem('gantt_user', JSON.stringify(usuario))
      }
    }
  }

  async function refreshUser() {
    if (!user.value) return
    
    try {
      const response = await fetch(`${API_URL}/users/${user.value.id}`, {
        headers: authHeaders(token.value)
      })
      if (response.status === 401) {
        logout()
        return
      }
      if (response.ok) {
        const result = await response.json()
        const userData = result.data || result
        user.value = userData
        if (typeof window !== 'undefined') {
          localStorage.setItem('gantt_user', JSON.stringify(userData))
        }
      }
    } catch (e) {
      console.error('Error refreshing user:', e)
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    mustChangePassword,
    usuariosDisponibles,
    activityLogs,
    isLoading,
    error,
    login,
    changePassword,
    createUser,
    deleteUser,
    assignTask,
    addLog,
    switchUser,
    logout,
    initFromStorage,
    refreshUser,
    resetPassword,
    refreshToken,
    fetchUsers,
    fetchLogs
  }
})