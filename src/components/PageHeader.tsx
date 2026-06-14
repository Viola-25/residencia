import type { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  icon: LucideIcon
  action?: React.ReactNode
}

export function PageHeader({ title, description, icon: Icon, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
          <Icon size={22} className="text-zinc-100" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
