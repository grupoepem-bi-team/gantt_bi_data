import type { Agent, AgentLoggerEntry, AgentAction } from './types'

export class AgentLogger {
  private static instance: AgentLogger
  private logs: AgentLoggerEntry[] = []

  static getInstance(): AgentLogger {
    if (!AgentLogger.instance) {
      AgentLogger.instance = new AgentLogger()
    }
    return AgentLogger.instance
  }

  log(agent: Agent, action: AgentAction, sessionId: string): void {
    const entry: AgentLoggerEntry = {
      agentId: agent.config.id,
      agentName: agent.config.name,
      action,
      sessionId
    }
    this.logs.unshift(entry)
    
    console.log(`[${agent.config.name}] ${action.type.toUpperCase()} - ${action.success ? 'SUCCESS' : 'FAILED'}${action.error ? ` (${action.error})` : ''}`)
  }

  getLogs(agentId?: string): AgentLoggerEntry[] {
    if (agentId) {
      return this.logs.filter(log => log.agentId === agentId)
    }
    return [...this.logs]
  }

  getRecentLogs(count: number = 50): AgentLoggerEntry[] {
    return this.logs.slice(0, count)
  }

  clearLogs(): void {
    this.logs = []
  }

  getStats(): { totalAgents: number; totalActions: number; successRate: number } {
    const uniqueAgents = new Set(this.logs.map(log => log.agentId))
    const successfulActions = this.logs.filter(log => log.action.success).length
    const totalActions = this.logs.length

    return {
      totalAgents: uniqueAgents.size,
      totalActions: totalActions,
      successRate: totalActions > 0 ? (successfulActions / totalActions) * 100 : 0
    }
  }
}