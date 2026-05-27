import type { AgentConfig } from '../types'
import { BaseAgent } from './BaseAgent'

export class UserAgent extends BaseAgent {
  async updateMyTaskProgress(taskId: string, progress: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getMyTasks(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/items?assigned_user_id=${this.config.id}`)
      return await response.json()
    } catch {
      return []
    }
  }

  async viewAllTasks(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/items`)
      return await response.json()
    } catch {
      return []
    }
  }

  async performUserScenario(): Promise<void> {
    console.log(`[${this.config.name}] Starting user scenario...`)
    
    await this.login()
    console.log(`[${this.config.name}] Logged in successfully`)

    const allTasks = await this.viewAllTasks()
    console.log(`[${this.config.name}] Viewing ${allTasks.length} total tasks`)

    const myTasks = await this.getMyTasks()
    console.log(`[${this.config.name}] Has ${myTasks.length} assigned tasks`)

    for (const task of myTasks) {
      const newProgress = Math.min(100, (task.progress || 0) + Math.floor(Math.random() * 20) + 10)
      const updated = await this.updateMyTaskProgress(task.id, newProgress)
      if (updated) {
        console.log(`[${this.config.name}] Updated task "${task.label}" progress to ${newProgress}%`)
      }
      await this.delay(300 + Math.random() * 500)
    }

    console.log(`[${this.config.name}] User scenario completed`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}