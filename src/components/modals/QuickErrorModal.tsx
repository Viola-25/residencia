import { useState, useEffect } from 'react'
import { MEDICAL_AREAS } from '../../types'
import type { MedicalArea } from '../../types'

interface QuickErrorModalProps {
  open: boolean
  onClose: () => void
  onSave: (notes: string, area: MedicalArea) => Promise<void>
}

export function QuickErrorModal({ open, onClose, onSave }: QuickErrorModalProps) {
  const [notes, setNotes] = useState('')
  const [area, setArea] = useState<MedicalArea>('clinica_medica')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose, saving])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">Erro Rápido</h3>
        <p className="mb-4 text-xs text-zinc-500">
          Descreva o erro que você cometeu. A IA identifica o tema e agenda a revisão automaticamente.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: esqueci que no choque obstrutivo por tamponamento a conduta inicial é pericardiocentese, fui direto pra volume"
          rows={4}
          className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as MedicalArea)}
          className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500 focus:outline-none"
        >
          {MEDICAL_AREAS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setNotes('')
              setArea('clinica_medica')
              onClose()
            }}
            disabled={saving}
            className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (!notes.trim() || saving) return
              setSaving(true)
              try {
                await onSave(notes, area)
                setNotes('')
                setArea('clinica_medica')
                onClose()
              } finally {
                setSaving(false)
              }
            }}
            disabled={!notes.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Salvando...' : 'Salvar Erro'}
          </button>
        </div>
      </div>
    </div>
  )
}
