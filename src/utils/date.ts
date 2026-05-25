import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'

dayjs.extend(weekOfYear)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

export function date(timestamp: number | string | Date) {
  return dayjs(timestamp)
}

export function startOfDay(date: dayjs.Dayjs | number) {
  return dayjs(date).startOf('day')
}

export function endOfDay(date: dayjs.Dayjs | number) {
  return dayjs(date).endOf('day')
}

export function getZoomConfig(zoomLevel: number) {
  if (zoomLevel <= 9) return { period: 'minute' as const, increment: 1, format: 'HH:mm' }
  if (zoomLevel <= 11) return { period: 'minute' as const, increment: 5, format: 'HH:mm' }
  if (zoomLevel <= 12) return { period: 'minute' as const, increment: 15, format: 'HH:mm' }
  if (zoomLevel <= 13) return { period: 'minute' as const, increment: 30, format: 'HH:mm' }
  if (zoomLevel <= 16) return { period: 'hour' as const, increment: 1, format: 'HH:mm' }
  if (zoomLevel <= 17) return { period: 'hour' as const, increment: 1, format: 'HH' }
  if (zoomLevel <= 23) return { period: 'day' as const, increment: 1, format: 'DD MMMM YYYY (dddd)' }
  if (zoomLevel <= 24) return { period: 'month' as const, increment: 1, format: 'MMMM YYYY' }
  if (zoomLevel <= 25) return { period: 'month' as const, increment: 1, format: 'MMM YYYY' }
  return { period: 'year' as const, increment: 1, format: 'YYYY' }
}

export function calculatePosition(
  itemStart: number,
  itemEnd: number,
  timelineStart: number,
  timelineEnd: number,
  timelineWidth: number
) {
  const totalDuration = timelineEnd - timelineStart
  const itemStartOffset = itemStart - timelineStart
  const itemEndOffset = itemEnd - timelineStart

  const left = (itemStartOffset / totalDuration) * timelineWidth
  const width = ((itemEndOffset - itemStartOffset) / totalDuration) * timelineWidth

  return { left, width: Math.max(width, 20) }
}

export function generateTimelineDates(startDate: Date, endDate: Date, period: string) {
  const dates: Date[] = []
  let current = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).endOf('day')

  while (current.isSameOrBefore(end)) {
    dates.push(current.toDate())
    switch (period) {
      case 'hour':
        current = current.add(1, 'hour')
        break
      case 'day':
        current = current.add(1, 'day')
        break
      case 'week':
        current = current.add(1, 'week')
        break
      case 'month':
        current = current.add(1, 'month')
        break
      default:
        current = current.add(1, 'day')
    }
  }

  return dates
}