import type { Agent, AgentConfig, AgentAction, TaskData } from '../types'
import { AgentLogger } from '../AgentLogger'

export abstract class BaseAgent implements Agent {
  config: AgentConfig
  isLoggedIn: boolean = false
  lastAction?: AgentAction
  protected logger: AgentLogger
  protected apiUrl: string

  constructor(config: AgentConfig, apiUrl: string = 'http://localhost:3000/api') {
    this.config = config
    this.apiUrl = apiUrl
    this.logger = AgentLogger.getInstance()
  }

  async login(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.config.email,
          password: 'epem2023@@'
        })
      })

      const data = await response.json()

      if (response.ok) {
        this.isLoggedIn = true
        this.lastAction = {
          type: 'login',
          timestamp: new Date(),
          details: { email: this.config.email },
          success: true
        }
        this.logger.log(this, this.lastAction, 'session-' + Date.now())
        return true
      } else {
        this.lastAction = {
          type: 'login',
          timestamp: new Date(),
          details: { email: this.config.email },
          success: false,
          error: data.error || 'Login failed'
        }
        return false
      }
    } catch (error: any) {
      this.lastAction = {
        type: 'login',
        timestamp: new Date(),
        details: { email: this.config.email },
        success: false,
        error: error.message
      }
      return false
    }
  }

  async logout(): Promise<void> {
    if (this.isLoggedIn) {
      this.lastAction = {
        type: 'logout',
        timestamp: new Date(),
        details: {},
        success: true
      }
      this.logger.log(this, this.lastAction, 'session-' + Date.now())
    }
    this.isLoggedIn = false
  }

  async performAction(action: string, data?: any): Promise<AgentAction> {
    if (!this.isLoggedIn) {
      const result: AgentAction = {
        type: 'login' as any,
        timestamp: new Date(),
        details: { action },
        success: false,
        error: 'Not logged in'
      }
      this.lastAction = result
      return result
    }

    let result: AgentAction

    switch (action) {
      case 'view_tasks':
        result = await this.viewTasks()
        break
      case 'create_task':
        result = await this.createTask(data as TaskData)
        break
      case 'update_task':
        result = await this.updateTask(data.id, data)
        break
      case 'delete_task':
        result = await this.deleteTask(data.id)
        break
      case 'assign_task':
        result = await this.assignTask(data.taskId, data.userId)
        break
      default:
        result = {
          type: action as any,
          timestamp: new Date(),
          details: { action },
          success: false,
          error: 'Unknown action'
        }
    }

    this.lastAction = result
    this.logger.log(this, result, 'session-' + Date.now())
    return result
  }

  protected async viewTasks(): Promise<AgentAction> {
    try {
      const response = await fetch(`${this.apiUrl}/items`)
      const items = await response.json()

      return {
        type: 'view_tasks',
        timestamp: new Date(),
        details: { count: items.length },
        success: true
      }
    } catch (error: any) {
      return {
        type: 'view_tasks',
        timestamp: new Date(),
        details: {},
        success: false,
        error: error.message
      }
    }
  }

  protected async createTask(task: TaskData): Promise<AgentAction> {
    try {
      const response = await fetch(`${this.apiUrl}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: task.label,
          row_id: task.rowId,
          time_start: task.timeStart.toISOString(),
          time_end: task.timeEnd.toISOString(),
          progress: task.progress,
          assigned_user_id: task.assignedUserId || null,
          created_by: this.config.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        return {
          type: 'create_task',
          timestamp: new Date(),
          details: { taskId: data.id, label: task.label },
          success: true
        }
      } else {
        return {
          type: 'create_task',
          timestamp: new Date(),
          details: { label: task.label },
          success: false,
          error: data.error
        }
      }
    } catch (error: any) {
      return {
        type: 'create_task',
        timestamp: new Date(),
        details: { label: task.label },
        success: false,
        error: error.message
      }
    }
  }

  protected async updateTask(taskId: string, updates: Partial<TaskData>): Promise<AgentAction> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        return {
          type: 'update_task',
          timestamp: new Date(),
          details: { taskId },
          success: true
        }
      } else {
        const data = await response.json()
        return {
          type: 'update_task',
          timestamp: new Date(),
          details: { taskId },
          success: false,
          error: data.error
        }
      }
    } catch (error: any) {
      return {
        type: 'update_task',
        timestamp: new Date(),
        details: { taskId },
        success: false,
        error: error.message
      }
    }
  }

  protected async deleteTask(taskId: string): Promise<AgentAction> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${taskId}`, {
        method: 'DELETE'
      })

      return {
        type: 'delete_task',
        timestamp: new Date(),
        details: { taskId },
        success: response.ok,
        error: response.ok ? undefined : 'Delete failed'
      }
    } catch (error: any) {
      return {
        type: 'delete_task',
        timestamp: new Date(),
        details: { taskId },
        success: false,
        error: error.message
      }
    }
  }

  protected async assignTask(taskId: string, userId: string): Promise<AgentAction> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_user_id: userId })
      })

      return {
        type: 'assign_task',
        timestamp: new Date(),
        details: { taskId, userId },
        success: response.ok
      }
    } catch (error: any) {
      return {
        type: 'assign_task',
        timestamp: new Date(),
        details: { taskId, userId },
        success: false,
        error: error.message
      }
    }
  }

  getStatus() {
    return {
      loggedIn: this.isLoggedIn,
      lastAction: this.lastAction
    }
  }
}