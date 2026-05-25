import * as XLSX from 'xlsx'
import type { GanttConfig, GanttItem } from '@/types/gantt'
import { date } from '@/utils/date'

export function useExcelExport() {
  function exportToExcel(config: GanttConfig, filename: string = 'gantt-chart') {
    const data = config.items.map(item => {
      const row = config.rows.find(r => r.id === item.rowId)
      return {
        'Task Name': item.label,
        'Assigned Row': row?.label || '',
        'Start Date': formatDate(item.time.start),
        'End Date': formatDate(item.time.end),
        'Duration (days)': Math.round((item.time.end - item.time.start) / 86400000),
        'Progress (%)': item.progress || 0,
        'Status': getStatus(item.progress)
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(data)

    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gantt Tasks')

    XLSX.writeFile(workbook, `${filename}.xlsx`)
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