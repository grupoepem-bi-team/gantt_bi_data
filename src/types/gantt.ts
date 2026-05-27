export interface Usuario {
  id: string
  nombre: string
  email: string
  avatar?: string
  color?: string
  rol?: string
  debe_cambiar_password?: boolean
  fecha_creacion?: string
  ultimo_acceso?: string
}

export interface GanttItem {
  id: string
  label: string
  rowId: string
  time: { start: number; end: number }
  progress?: number
  assignedUserId?: string
  assignedUserIds?: string[]
  createdBy?: string
  color?: string
}

export interface GanttRow {
  id: string
  label: string
}

export interface GanttColumn {
  id: string
  label: string
  data: string | ((row: GanttRow) => unknown)
  width: number
  header?: { content: string }
}

export interface GanttDependency {
  from: string
  to: string
}

export interface GanttConfig {
  rows: GanttRow[]
  items: GanttItem[]
  columns: GanttColumn[]
  dependencies?: GanttDependency[]
  startDate?: Date
  endDate?: Date
}

export interface AuthState {
  user: Usuario | null
  token: string | null
  isAuthenticated: boolean
}