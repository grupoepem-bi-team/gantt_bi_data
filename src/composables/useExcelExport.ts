import ExcelJS from 'exceljs'
import type { GanttConfig } from '@/types/gantt'
import { date } from '@/utils/date'
import { useAuthStore } from '@/stores/authStore'

export function useExcelExport() {
  async function exportToExcel(config: GanttConfig, filename: string = 'gantt-chart') {
    const authStore = useAuthStore()
    const usuarios = authStore.usuariosDisponibles || authStore.usuarios || []
    const userMap = new Map(usuarios.map(u => [u.id, u.nombre]))

    const data = config.items.map(item => {
      const row = config.rows.find(r => r.id === item.rowId)
      return {
        'Task Name': item.label,
        'Assigned Row': row?.label || '',
        'Start Date': formatDate(item.time.start),
        'End Date': formatDate(item.time.end),
        'Duration (days)': Math.round((item.time.end - item.time.start) / 86400000),
        'Progress (%)': item.progress || 0,
        'Status': getStatus(item.progress),
        'Usuarios': (item.assignedUserIds || []).map(id => userMap.get(id) || id).filter(Boolean).join('; ') || (item.assignedUserId ? (userMap.get(item.assignedUserId) || '') : ''),
        'Creado Por': item.createdBy ? (userMap.get(item.createdBy) || '') : ''
      }
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Gantt Tasks')

    const columns = [
      { header: 'Task Name', key: 'Task Name', width: 25 },
      { header: 'Assigned Row', key: 'Assigned Row', width: 20 },
      { header: 'Start Date', key: 'Start Date', width: 18 },
      { header: 'End Date', key: 'End Date', width: 18 },
      { header: 'Duration (days)', key: 'Duration (days)', width: 15 },
      { header: 'Progress (%)', key: 'Progress (%)', width: 12 },
      { header: 'Status', key: 'Status', width: 15 },
      { header: 'Usuarios', key: 'Usuarios', width: 20 },
      { header: 'Creado Por', key: 'Creado Por', width: 20 }
    ]

    worksheet.columns = columns

    worksheet.getRow(1).font = { bold: true }

    data.forEach(row => {
      worksheet.addRow(row)
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }

  function formatDate(timestamp: number): string {
    return date(timestamp).format('DD/MM/YYYY HH:mm')
  }

  function getStatus(progress?: number): string {
    if (!progress && progress !== 0) return 'Not Started'
    if (progress === 100) return 'Completed'
    if (progress >= 75) return 'In Progress'
    if (progress >= 50) return 'Half Done'
    if (progress >= 25) return 'Started'
    if (progress > 0) return 'Early Stage'
    return 'Not Started'
  }

  return {
    exportToExcel
  }
}