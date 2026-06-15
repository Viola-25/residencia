import { differenceInDays, startOfWeek, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function getDaysUntil(targetDate: string): number {
  const target = parseISO(targetDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, differenceInDays(target, today))
}

export function getCurrentWeekStart(): string {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(start, 'yyyy-MM-dd')
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "d 'de' MMM 'de' yyyy", { locale: ptBR })
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy')
}

export function getWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  return `Sem ${d.getMonth() + 1}/${d.getDate()}`
}

export function isCurrentWeek(weekStart: string): boolean {
  const currentStart = getCurrentWeekStart()
  return weekStart === currentStart
}
