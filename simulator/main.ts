// Using native fetch API - no imports needed

// Database pool removed - using HTTP API instead

interface AgentConfig {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  color: string
  avatar: string
}

interface TaskData {
  label: string
  rowId: string
  timeStart: Date
  timeEnd: Date
  progress: number
  assignedUserId?: string
}

class BaseAgent {
  config: AgentConfig
  isLoggedIn: boolean = false
  apiUrl: string

  constructor(config: AgentConfig, apiUrl: string = 'http://localhost:3000/api') {
    this.config = config
    this.apiUrl = apiUrl
  }

  async login(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: this.config.name,
          password: 'epem2023@@'
        })
      })
      const data = await response.json()
      this.isLoggedIn = response.ok
      return this.isLoggedIn
    } catch {
      return false
    }
  }

  async logout(): Promise<void> {
    this.isLoggedIn = false
  }

  async viewTasks(): Promise<number> {
    try {
      const response = await fetch(`${this.apiUrl}/items`)
      const items = await response.json()
      return items.length
    } catch {
      return 0
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

  async createTask(task: TaskData): Promise<string | null> {
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
      return data.id || null
    } catch {
      return null
    }
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<boolean> {
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

  async assignTask(taskId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/items/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_user_id: userId })
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/users`)
      return await response.json()
    } catch {
      return []
    }
  }
}

class AdminAgent extends BaseAgent {
  async createAndAssignTask(task: TaskData, userId: string): Promise<void> {
    const taskId = await this.createTask(task)
    if (taskId) {
      await this.assignTask(taskId, userId)
      await this.logActivity('CREAR', `Creo y asigno tarea: ${task.label}`)
    }
  }

  private async logActivity(accion: string, descripcion: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: this.config.id,
          usuario_nombre: this.config.name,
          accion,
          descripcion
        })
      })
    } catch {}
  }
}

class UserAgent extends BaseAgent {
  async updateMyTaskProgress(): Promise<void> {
    const myTasks = await this.getMyTasks()
    if (myTasks.length > 0) {
      const task = myTasks[Math.floor(Math.random() * myTasks.length)]
      const currentProgress = task.progress || 0
      const increment = Math.floor(Math.random() * 20) + 5
      const newProgress = Math.min(100, currentProgress + increment)
      const result = await this.updateTaskProgress(task.id, newProgress)
      if (result) {
        console.log(`  [${this.config.avatar}] Actualizo "${task.label}" ${currentProgress}% -> ${newProgress}%`)
      }
    }
  }
}

const AGENTS: AgentConfig[] = [
  { id: 'agent-admin-1', name: 'Carlos Analista BI', email: 'carlos.analista@epem.com', role: 'admin', color: '#dc2626', avatar: 'CA' },
  { id: 'agent-user-1', name: 'Maria Desarrolladora', email: 'maria.dev@epem.com', role: 'user', color: '#7c3aed', avatar: 'MD' },
  { id: 'agent-user-2', name: 'Pedro Tester', email: 'pedro.tester@epem.com', role: 'user', color: '#059669', avatar: 'PT' }
]

const TASK_TEMPLATES = [
  { label: 'Analisis de metricas ventas Q2', rowId: '11111111-1111-1111-1111-111111111111' },
  { label: 'Dashboard indicadores KPI', rowId: '22222222-2222-2222-2222-222222222222' },
  { label: 'Reporte monthly executive', rowId: '33333333-3333-3333-3333-333333333333' },
  { label: 'Reporte quarterly financiero', rowId: '44444444-4444-4444-4444-444444444444' },
  { label: 'Automatizacion reportes', rowId: '55555555-5555-5555-5555-555555555555' }
]

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runSimulation() {
  console.log('=== BI Agent Simulation Started ===\n')
  console.log(`API: http://localhost:3000/api`)
  console.log(`Start: ${new Date().toLocaleString()}\n`)

  const adminAgent = new AdminAgent(AGENTS[0])
  const userAgents = [new UserAgent(AGENTS[1]), new UserAgent(AGENTS[2])]

  console.log('Logging in agents...')
  await adminAgent.login()
  console.log(`  [CA] Carlos Analista BI - LOGIN OK`)

  for (const user of userAgents) {
    await user.login()
    console.log(`  [${user.config.avatar}] ${user.config.name} - LOGIN OK`)
  }

  console.log('\n--- Starting Interactive Simulation (60 seconds) ---\n')

  let iteration = 0
  const startTime = Date.now()

  while (Date.now() - startTime < 60000) {
    iteration++
    console.log(`[Iteracion ${iteration}] ${new Date().toLocaleTimeString()}`)

    const scenario = Math.floor(Math.random() * 4)

    switch (scenario) {
      case 0:
        console.log('  [CA] Creando nueva tarea...')
        const template = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)]
        const users = await adminAgent.getAllUsers()
        if (users.length > 0) {
          const user = users[Math.floor(Math.random() * users.length)]
          const task = {
            label: `${template.label} ${new Date().toLocaleDateString()}`,
            rowId: template.rowId,
            timeStart: new Date(),
            timeEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            progress: 0
          }
          await adminAgent.createAndAssignTask(task, user.id)
          console.log(`  [CA] Tarea creada: "${task.label}" -> ${user.nombre}`)
        }
        break

      case 1:
        console.log('  [CA] Verificando todas las tareas...')
        const count = await adminAgent.viewTasks()
        console.log(`  [CA] Total tareas: ${count}`)
        break

      case 2:
        const user = userAgents[Math.floor(Math.random() * userAgents.length)]
        console.log(`  [${user.config.avatar}] ${user.config.name} actualizando progreso...`)
        await user.updateMyTaskProgress()
        break

      case 3:
        const user2 = userAgents[Math.floor(Math.random() * userAgents.length)]
        const myTasks = await user2.getMyTasks()
        console.log(`  [${user2.config.avatar}] ${user2.config.name} tiene ${myTasks.length} tareas asignadas`)
        break
    }

    console.log('')
    await sleep(8000)
  }

  console.log('--- Simulation Ended ---')
  console.log(`Total iterations: ${iteration}`)
  process.exit(0)
}

runSimulation().catch(console.error)