import { useState, useMemo } from 'react'
import { AlertTriangle, Search, Trash2, TrendingUp, BarChart3, Clock } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { Badge } from '../components/Badge'
import { useData } from '../hooks/useData'
import { formatDateShort } from '../lib/dates'
import type { ErrorReason } from '../types'
import { ERROR_REASONS } from '../types'

const reasonColors: Record<ErrorReason, 'red' | 'yellow' | 'blue' | 'zinc' | 'green'> = {
  nao_sabia: 'red',
  esqueci: 'yellow',
  interpretacao: 'blue',
  pegadinha: 'zinc',
  pressa: 'green',
}

export function ErrorBank() {
  const { errors, toggleErrorReview, deleteError } = useData()
  const [search, setSearch] = useState('')
  const [filterReason, setFilterReason] = useState<ErrorReason | 'all'>('all')
  const [filterReview, setFilterReview] = useState<'all' | 'pending' | 'reviewed'>('all')

  const topicStats = useMemo(() => {
    const topicMap = new Map<string, { count: number; lastDate: string; reasons: Set<string> }>()
    for (const e of errors) {
      const existing = topicMap.get(e.topic) || { count: 0, lastDate: '', reasons: new Set<string>() }
      existing.count++
      existing.reasons.add(e.error_reason)
      const d = e.created_at.split('T')[0]
      if (d > existing.lastDate) existing.lastDate = d
      topicMap.set(e.topic, existing)
    }
    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        lastDate: data.lastDate,
        reasons: Array.from(data.reasons),
      }))
      .sort((a, b) => b.count - a.count)
  }, [errors])

  const filtered = useMemo(() => {
    return errors.filter((e) => {
      if (
        search &&
        !e.question.toLowerCase().includes(search.toLowerCase()) &&
        !e.topic.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (filterReason !== 'all' && e.error_reason !== filterReason) return false
      if (filterReview === 'pending' && e.reviewed) return false
      if (filterReview === 'reviewed' && !e.reviewed) return false
      return true
    })
  }, [errors, search, filterReason, filterReview])

  const reasonRanking = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of errors) {
      counts[e.error_reason] = (counts[e.error_reason] || 0) + 1
    }
    return Object.entries(counts)
      .map(([reason, count]) => ({
        reason: ERROR_REASONS.find((r) => r.value === reason)?.label || reason,
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [errors])

  const lastErrors = useMemo(() => {
    return [...errors].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  }, [errors])

  const needsReview = useMemo(() => {
    return errors.filter((e) => e.needs_review && !e.reviewed)
  }, [errors])

  return (
    <div>
      <PageHeader
        title="Banco de Erros"
        description="Consulte, revise e analise seus erros registrados automaticamente"
        icon={AlertTriangle}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Erros"
          value={errors.length}
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Temas Diferentes"
          value={topicStats.length}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Pendentes Revisão"
          value={needsReview.length}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Mais Frequente"
          value={reasonRanking[0]?.reason || '-'}
          icon={TrendingUp}
          color="violet"
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Assuntos Mais Errados</h3>
          <div className="space-y-2">
            {topicStats.slice(0, 8).map((item, i) => (
              <div key={item.topic} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-xs text-zinc-600">{i + 1}º</span>
                  <span className="truncate text-zinc-300">{item.topic}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-500">{item.lastDate ? formatDateShort(item.lastDate) : ''}</span>
                  <span className="font-medium text-zinc-400">{item.count}x</span>
                </div>
              </div>
            ))}
            {topicStats.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum erro registrado</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Ranking de Motivos</h3>
          <div className="space-y-2">
            {reasonRanking.map((item, i) => (
              <div key={item.reason} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">{i + 1}º</span>
                  <span className="text-zinc-300">{item.reason}</span>
                </div>
                <span className="font-medium text-zinc-400">{item.count}</span>
              </div>
            ))}
            {reasonRanking.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum erro registrado</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Últimos Erros</h3>
          <div className="space-y-2">
            {lastErrors.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-zinc-300">{e.topic}</span>
                </div>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatDateShort(e.created_at.split('T')[0])}
                </span>
              </div>
            ))}
            {lastErrors.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhum erro registrado</p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              placeholder="Buscar por questão ou tema..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <select
            value={filterReason}
            onChange={(e) =>
              setFilterReason(e.target.value as ErrorReason | 'all')
            }
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">Todos os motivos</option>
            {ERROR_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={filterReview}
            onChange={(e) =>
              setFilterReview(e.target.value as 'all' | 'pending' | 'reviewed')
            }
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="reviewed">Revisados</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-500">
                <th className="px-4 py-3">Erro / Descrição</th>
                <th className="px-4 py-3">Tema</th>
                <th className="px-4 py-3">Recorrência</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Revisão</th>
                <th className="px-4 py-3">Última Ocorrência</th>
                <th className="px-4 py-3">Sugestão</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((err) => (
                <tr
                  key={err.id}
                  className="border-b border-zinc-800/50 text-zinc-300 last:border-b-0 hover:bg-zinc-800/30"
                >
                  <td className="max-w-xs truncate px-4 py-3">{err.question}</td>
                  <td className="px-4 py-3 font-medium">{err.topic}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${err.recorrencia > 1 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {err.recorrencia}x
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={reasonColors[err.error_reason]}>
                      {ERROR_REASONS.find((r) => r.value === err.error_reason)?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleErrorReview(err.id)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        err.reviewed
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {err.reviewed ? 'Revisado' : 'Pendente'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {err.ultima_ocorrencia ? formatDateShort(err.ultima_ocorrencia) : formatDateShort(err.created_at.split('T')[0])}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-zinc-500">
                    {err.sugestao_revisao || (err.recorrencia > 1 ? 'Rever com urgência' : err.needs_review ? 'Revisar' : '-')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm('Excluir este erro?')) deleteError(err.id)
                      }}
                      className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    {errors.length === 0
                      ? 'Nenhum erro registrado. Os erros são extraídos automaticamente das observações dos registros de estudo.'
                      : 'Nenhum erro encontrado com os filtros atuais'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
