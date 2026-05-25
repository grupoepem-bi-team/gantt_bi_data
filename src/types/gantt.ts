export interface GanttRow {
  id: string
  label: string
  parentId?: string
  expanded?: boolean
  [key: string]: unknown
}

export interface GanttItem {
  id: string
  label: string
  rowId: string
  time: {
    start: number
    end: number
  }
  progress?: number
  dependency?: string
  [key: string]: unknown
}

export interface GanttColumn {
  id: string
  label: string
  data: string | ((row: GanttRow) => unknown)
  width?: number
  sortable?: boolean | string | ((row: GanttRow) => number)
  isHTML?: boolean
  header?: {
    content: string
  }
}

export interface GanttDependency {
  from: string
  to: string
  type?: 'finish-to-start' | 'start-to-start' | 'finish-to-finish'
}

export interface GanttConfig {
  rows: GanttRow[]
  items: GanttItem[]
  columns: GanttColumn[]
  dependencies?: GanttDependency[]
  startDate?: Date
  endDate?: Date
}

export interface TimelineSlot {
  period: 'hour' | 'day' | 'week' | 'month'
  start: number
  end: number
  zoom: number
}