import { useState } from 'react'
import { Settings as SettingsIcon, Save, Calendar, Target, BookOpen, Clock, FileText, Loader2, Download } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../hooks/useData'

export function Settings() {
  const { config, updateConfig, loading } = useData()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  const [form, setForm] = useState(() => ({ ...config }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateConfig(form)
      setSaved(true)
      setError(false)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  const set = (field: keyof typeof form, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  if (loading) {
    return (
      <div>
        <PageHeader title="Configurações" description="Carregando..." icon={SettingsIcon} />
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Personalize suas metas e datas do ciclo de preparação"
        icon={SettingsIcon}
      />

      <form key={config.id} onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Calendar size={16} className="text-violet-400" />
            Datas do Ciclo
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Data ENAMED</label>
              <input
                type="date"
                value={form.enamed_date}
                onChange={(e) => set('enamed_date', e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">1ª Prova Residência</label>
              <input
                type="date"
                value={form.first_exam_date}
                onChange={(e) => set('first_exam_date', e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Target size={16} className="text-emerald-400" />
            Metas de Questões
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Diária</label>
              <input
                type="number"
                min={0}
                value={form.daily_questions_goal}
                onChange={(e) => set('daily_questions_goal', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Semanal</label>
              <input
                type="number"
                min={0}
                value={form.weekly_goal}
                onChange={(e) => set('weekly_goal', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Mensal</label>
              <input
                type="number"
                min={0}
                value={form.monthly_goal}
                onChange={(e) => set('monthly_goal', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Meta anual: {form.yearly_goal.toLocaleString()} questões
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <BookOpen size={16} className="text-blue-400" />
            Metas de Estudo
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                <Clock size={12} className="mr-1 inline text-zinc-500" />
                Horas de Estudo / Dia
              </label>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={form.daily_hours_goal}
                onChange={(e) => set('daily_hours_goal', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                <FileText size={12} className="mr-1 inline text-zinc-500" />
                Simulados / Semana
              </label>
              <input
                type="number"
                min={0}
                value={form.mock_goal_per_week}
                onChange={(e) => set('mock_goal_per_week', Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            Salvar Configurações
          </button>
          {saved && (
            <span className="text-sm text-emerald-400 transition-opacity">
              Configurações salvas!
            </span>
          )}
          {error && (
            <span className="text-sm text-rose-400 transition-opacity">
              Erro ao salvar. Tente novamente.
            </span>
          )}
        </div>
      </form>

      <div className="mt-6 max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Download size={16} className="text-violet-400" />
          Extensão do Chrome — sync em 1 clique
        </h3>
        <p className="mb-4 text-xs text-zinc-500">
          Puxa os testes finalizados do MedCof e grava aqui sem terminal. Usa a sessão que já existe no
          navegador — não pede senha.
        </p>

        <a
          href="/extensao/medcof-extensao.zip"
          download
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <Download size={16} />
          Baixar extensão (.zip)
        </a>

        <ol className="mt-4 space-y-1.5 text-xs text-zinc-400">
          <li>
            <span className="text-zinc-600">1.</span> Descompacte o zip num lugar fixo (ex.:{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-[11px] text-zinc-300">
              C:\Users\voce\medcof-extensao
            </code>
            ). Não apague depois.
          </li>
          <li>
            <span className="text-zinc-600">2.</span> Abra{' '}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-[11px] text-zinc-300">
              chrome://extensions
            </code>{' '}
            e ligue o <strong className="text-zinc-300">Modo do desenvolvedor</strong>.
          </li>
          <li>
            <span className="text-zinc-600">3.</span>{' '}
            <strong className="text-zinc-300">Carregar sem compactação</strong> → selecione a pasta
            descompactada.
          </li>
        </ol>

        <p className="mt-3 text-[11px] text-zinc-600">
          O Chrome não permite instalar direto do site — é obrigatório passar por{' '}
          <code>chrome://extensions</code>. Para atualizar, baixe o zip de novo e clique em{' '}
          <strong className="text-zinc-500">Recarregar</strong> no card da extensão.
        </p>
      </div>
    </div>
  )
}
