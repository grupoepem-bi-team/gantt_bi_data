import type { Agent, AgentConfig, AgentRole } from './types'
import { AdminAgent } from './agents/AdminAgent'
import { UserAgent } from './agents/UserAgent'

export class AgentFactory {
  static createAgent(role: AgentRole, config: AgentConfig): Agent {
    switch (role) {
      case 'admin':
        return new AdminAgent(config)
      case 'user':
        return new UserAgent(config)
      default:
        throw new Error(`Unknown agent role: ${role}`)
    }
  }

  static createDemoAgents(): Agent[] {
    const agents: Agent[] = []

    agents.push(new AdminAgent({
      id: 'agent-admin-1',
      name: 'Carlos Analista BI',
      email: 'carlos.analista@epem.com',
      role: 'admin',
      color: '#dc2626',
      avatar: 'CA'
    }))

    agents.push(new UserAgent({
      id: 'agent-user-1',
      name: 'Maria Desarrolladora',
      email: 'maria.dev@epem.com',
      role: 'user',
      color: '#7c3aed',
      avatar: 'MD'
    }))

    agents.push(new UserAgent({
      id: 'agent-user-2',
      name: 'Pedro Tester',
      email: 'pedro.tester@epem.com',
      role: 'user',
      color: '#059669',
      avatar: 'PT'
    }))

    return agents
  }
}

export { Agent, AgentConfig, AgentRole } from './types'
export { AdminAgent } from './agents/AdminAgent'
export { UserAgent } from './agents/UserAgent'
export { TaskScheduler } from './TaskScheduler'
export { AgentLogger } from './AgentLogger'