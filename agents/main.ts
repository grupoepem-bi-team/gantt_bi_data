import { TaskScheduler } from './TaskScheduler'

const scheduler = new TaskScheduler()

async function main() {
  console.log('=== BI Agent Simulation ===\n')
  
  const status = scheduler.getStatus()
  console.log(`Agents configured: ${status.agentsCount}`)
  
  await scheduler.startSimulation(15000)
  
  setTimeout(() => {
    scheduler.stopSimulation()
    process.exit(0)
  }, 120000)
}

main().catch(console.error)