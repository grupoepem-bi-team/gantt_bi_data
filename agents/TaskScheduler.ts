import type { Agent, TaskSchedule } from './types'
import { AgentFactory } from './index'

export class TaskScheduler {
  private agents: Agent[] = []
  private schedules: TaskSchedule[] = []
  private isRunning: boolean = false
  private intervalId?: NodeJS.Timeout

  constructor() {
    this.agents = AgentFactory.createDemoAgents()
  }

  async startSimulation(intervalMs: number = 10000): Promise<void> {
    if (this.isRunning) {
      console.log('Simulation already running')
      return
    }

    console.log('Starting BI Agent simulation...')
    this.isRunning = true

    for (const agent of this.agents) {
      await agent.login()
    }

    this.intervalId = setInterval(async () => {
      await this.runScheduledTasks()
    }, intervalMs)

    await this.runScheduledTasks()
  }

  stopSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('Simulation stopped')
  }

  private async runScheduledTasks(): Promise<void> {
    console.log('\n--- Running scheduled tasks ---')

    for (const agent of this.agents) {
      if (agent instanceof (await import('./agents/AdminAgent')).AdminAgent) {
        await this.runAdminTasks(agent)
      } else {
        await this.runUserTasks(agent)
      }
    }

    console.log('--- Scheduled tasks completed ---\n')
  }

  private async runAdminTasks(agent: any): Promise<void> {
    const scenario = Math.floor(Math.random() * 3)

    switch (scenario) {
      case 0:
        await this.createRandomTasks(agent, 1)
        break
      case 1:
        await this.viewAllTasks(agent)
        break
      case 2:
        await this.checkUsersAndLogs(agent)
        break
    }
  }

  private async runUserTasks(agent: any): Promise<void> {
    const scenario = Math.floor(Math.random() * 3)

    switch (scenario) {
      case 0:
        await this.updateMyTaskProgress(agent)
        break
      case 1:
        await this.viewAllTasks(agent)
        break
      case 2:
        await this.viewMyTasks(agent)
        break
    }
  }

  private async createRandomTasks(agent: any, count: number): Promise<void> {
    const taskTemplates = [
      { label: 'Analisis de datos', rowId: '11111111-1111-1111-1111-111111111111' },
      { label: 'Desarrollo de reporte', rowId: '22222222-2222-2222-2222-222222222222' },
      { label: 'Testing de metrics', rowId: '33333333-3333-3333-3333-333333333333' },
      { label: 'Despliegue de dashboard', rowId: '44444444-4444-4444-4444-444444444444' },
      { label: 'Documentacion tecnica', rowId: '55555555-5555-5555-5555-555555555555' }
    ]

    const users = await agent.getAllUsers()
    if (users.length === 0) return

    for (let i = 0; i < count; i++) {
      const template = taskTemplates[Math.floor(Math.random() * taskTemplates.length)]
      const user = users[Math.floor(Math.random() * users.length)]
      const daysOffset = Math.floor(Math.random() * 7)

      const task = {
        label: `${template.label} - ${new Date().toLocaleDateString()}`,
        rowId: template.rowId,
        timeStart: new Date(),
        timeEnd: new Date(Date.now() + (daysOffset + 3) * 24 * 60 * 60 * 1000),
        progress: 0
      }

      await agent.createAndAssignTask(task, user.id)
      console.log(`[${agent.config.name}] Created and assigned: ${task.label}`)
    }
  }

  private async viewAllTasks(agent: any): Promise<void> {
    const items = await agent.performAction('view_tasks')
    console.log(`[${agent.config.name}] Viewed ${items.details.count || 0} tasks`)
  }

  private async checkUsersAndLogs(agent: any): Promise<void> {
    const users = await agent.getAllUsers()
    const logs = await agent.getActivityLogs()
    console.log(`[${agent.config.name}] Checked ${users.length} users and ${logs.length} log entries`)
  }

  private async updateMyTaskProgress(agent: any): Promise<void> {
    const myTasks = await agent.getMyTasks()
    
    if (myTasks.length > 0) {
      const task = myTasks[Math.floor(Math.random() * myTasks.length)]
      const currentProgress = task.progress || 0
      const increment = Math.floor(Math.random() * 20) + 5
      const newProgress = Math.min(100, currentProgress + increment)

      const result = await agent.updateMyTaskProgress(task.id, newProgress)
      if (result) {
        console.log(`[${agent.config.name}] Updated "${task.label}" from ${currentProgress}% to ${newProgress}%`)
      }
    } else {
      console.log(`[${agent.config.name}] No tasks assigned`)
    }
  }

  private async viewMyTasks(agent: any): Promise<void> {
    const myTasks = await agent.getMyTasks()
    console.log(`[${agent.config.name}] Has ${myTasks.length} assigned tasks`)
  }

  addSchedule(schedule: TaskSchedule): void {
    this.schedules.push(schedule)
  }

  removeSchedule(scheduleId: string): void {
    this.schedules = this.schedules.filter(s => s.id !== scheduleId)
  }

  getSchedules(): TaskSchedule[] {
    return [...this.schedules]
  }

  getAgents(): Agent[] {
    return [...this.agents]
  }

  getStatus(): { running: boolean; agentsCount: number; schedulesCount: number } {
    return {
      running: this.isRunning,
      agentsCount: this.agents.length,
      schedulesCount: this.schedules.length
    }
  }
}