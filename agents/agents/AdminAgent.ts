import type { AgentConfig, TaskData } from '../types'
import { BaseAgent } from './BaseAgent'

export class AdminAgent extends BaseAgent {
  async createUser(userData: { nombre: string; email: string; rol: string; password: string }): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      return response.ok
    } catch {
      return false
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}`, {
        method: 'DELETE'
      })
      return response.ok
    } catch {
      return false
    }
  }

  async assignTaskToUser(taskId: string, userId: string, taskName: string): Promise<void> {
    await this.assignTask(taskId, userId)
    
    const userResponse = await fetch(`${this.apiUrl}/users/${userId}`)
    const user = await userResponse.json()
    
    await this.logActivity('ASIGNAR', `Asigno tarea "${taskName}" a ${user.nombre}`, taskId, taskName)
  }

  async createAndAssignTask(task: TaskData, userId: string): Promise<string | null> {
    const createResult = await this.createTask(task)
    
    if (createResult.success && createResult.details.taskId) {
      await this.assignTask(createResult.details.taskId, userId)
      await this.logActivity('CREAR', `Creo y asigno tarea: ${task.label}`, createResult.details.taskId, task.label)
      return createResult.details.taskId
    }
    
    return null
  }

  async getAllUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/users`)
      return await response.json()
    } catch {
      return []
    }
  }

  async getActivityLogs(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/logs`)
      return await response.json()
    } catch {
      return []
    }
  }

  private async logActivity(accion: string, descripcion: string, targetId?: string, targetNombre?: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: this.config.id,
          usuario_nombre: this.config.name,
          accion,
          descripcion,
          target_id: targetId,
          target_nombre: targetNombre
        })
      })
    } catch (e) {
      console.error('Failed to log activity:', e)
    }
  }

  async performAdminScenario(): Promise<void> {
    console.log(`[${this.config.name}] Starting admin scenario...`)
    
    await this.login()
    console.log(`[${this.config.name}] Logged in successfully`)

    const users = await this.getAllUsers()
    console.log(`[${this.config.name}] Found ${users.length} users`)

    const tasks = [
      {
        label: 'Analisis de datos de ventas Q2',
        rowId: '11111111-1111-1111-1111-111111111111',
        timeStart: new Date(),
        timeEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        progress: 0
      },
      {
        label: 'Dashboard de metricas KPIs',
        rowId: '22222222-2222-2222-2222-222222222222',
        timeStart: new Date(),
        timeEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        progress: 25
      },
      {
        label: 'Reporte mensual executive',
        rowId: '33333333-3333-3333-3333-333333333333',
        timeStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        timeEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        progress: 0
      }
    ]

    for (const task of tasks) {
      const user = users[Math.floor(Math.random() * users.length)]
      await this.createAndAssignTask(task, user.id)
      console.log(`[${this.config.name}] Created task: ${task.label}`)
      await this.delay(500)
    }

    console.log(`[${this.config.name}] Admin scenario completed`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}