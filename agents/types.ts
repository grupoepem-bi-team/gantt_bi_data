export type AgentRole = 'admin' | 'user'

export interface AgentConfig {
  id: string
  name: string
  email: string
  role: AgentRole
  color: string
  avatar: string
}

export interface AgentAction {
  type: 'login' | 'logout' | 'create_task' | 'update_task' | 'delete_task' | 'assign_task' | 'view_tasks' | 'change_password' | 'create_user' | 'delete_user'
  timestamp: Date
  details: Record<string, any>
  success: boolean
  error?: string
}

export interface TaskData {
  label: string
  rowId: string
  timeStart: Date
  timeEnd: Date
  progress: number
  assignedUserId?: string
}

export interface Agent {
  config: AgentConfig
  isLoggedIn: boolean
  lastAction?: AgentAction

  login(): Promise<boolean>
  logout(): Promise<void>
  performAction(action: string, data?: any): Promise<AgentAction>
  getStatus(): { loggedIn: boolean; lastAction?: AgentAction }
}

export interface AgentLoggerEntry {
  agentId: string
  agentName: string
  action: AgentAction
  sessionId: string
}

export interface TaskSchedule {
  id: string
  agentId: string
  action: string
  data: any
  scheduledFor: Date
  executed: boolean
  executedAt?: Date
}