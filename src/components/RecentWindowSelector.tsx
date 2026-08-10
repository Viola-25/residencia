import { RECENT_WINDOW_OPTIONS, type RecentWindow } from '../hooks/useData'

interface RecentWindowSelectorProps {
  value: RecentWindow
  onChange: (value: RecentWindow) => void
  className?: string
}

export function RecentWindowSelector({ value, onChange, className = '' }: RecentWindowSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as RecentWindow)}
      className={`rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none ${className}`}
    >
      {RECENT_WINDOW_OPTIONS.map((days) => (
        <option key={days} value={days}>
          Últimos {days} dias
        </option>
      ))}
    </select>
  )
}