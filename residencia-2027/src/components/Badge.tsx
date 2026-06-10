interface BadgeProps {
  variant: 'red' | 'yellow' | 'green' | 'blue' | 'zinc'
  children: React.ReactNode
}

const variantClasses: Record<string, string> = {
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  zinc: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
