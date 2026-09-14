import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { ErrorEntry, MedicalArea } from '../../types'
import { calculateNextSRSState, classifyErrorReason } from '../../lib/calculations'
import { analyzeAndClusterError } from '../../lib/groq'

export function useErrorBank() {
  const { user } = useAuth()
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const res = await supabase
          .from('error_bank')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (res.error) throw res.error
        if (res.data) setErrors(res.data as ErrorEntry[])
      } catch (err) {
        console.error('Error fetching errors:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const reviewErrorWithSRS = async (id: string, quality: 'easy' | 'good' | 'hard' | 'forgot') => {
    const previousErrors = errors
    const error = previousErrors.find((e) => e.id === id)
    if (!error) return

    const srsState = calculateNextSRSState(
      {
        interval_days: error.interval_days,
        ease_factor: error.ease_factor,
        repetitions: error.repetitions,
      },
      quality
    )

    setErrors((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              reviewed: true,
              next_review_date: srsState.next_review_date,
              interval_days: srsState.interval_days,
              ease_factor: srsState.ease_factor,
              repetitions: srsState.repetitions,
            }
          : e
      )
    )

    try {
      const res = await supabase
        .from('error_bank')
        .update({
          reviewed: true,
          next_review_date: srsState.next_review_date,
          interval_days: srsState.interval_days,
          ease_factor: srsState.ease_factor,
          repetitions: srsState.repetitions,
        })
        .eq('id', id)
      if (res.error) throw res.error
    } catch (err) {
      setErrors(previousErrors)
      console.error('Error updating SRS state:', err)
    }
  }

  const deleteError = async (id: string) => {
    const previousErrors = errors
    setErrors((prev) => prev.filter((e) => e.id !== id))
    try {
      const res = await supabase.from('error_bank').delete().eq('id', id)
      if (res.error) throw res.error
    } catch (err) {
      setErrors(previousErrors)
      console.error('Error deleting error:', err)
    }
  }

  const addSmartError = async (notes: string, area: MedicalArea) => {
    if (!user) return

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('error_bank')
        .select('id, topic')
        .eq('area', area)
      if (fetchErr) throw fetchErr

      const analysis = await analyzeAndClusterError(notes, existing || [])

      if (analysis.isDuplicate && analysis.existingErrorId) {
        const { data: currentError, error: selErr } = await supabase
          .from('error_bank')
          .select('occurrence_count, history_notes, interval_days, ease_factor, repetitions')
          .eq('id', analysis.existingErrorId)
          .single()
        if (selErr) throw selErr

        const newCount = (currentError?.occurrence_count || 1) + 1
        const newHistory = [...(currentError?.history_notes || []), notes]

        const srsState = calculateNextSRSState(
          {
            interval_days: currentError?.interval_days ?? 0,
            ease_factor: currentError?.ease_factor ?? 2.5,
            repetitions: currentError?.repetitions ?? 0,
          },
          'forgot'
        )

        const { error: updErr } = await supabase
          .from('error_bank')
          .update({
            occurrence_count: newCount,
            history_notes: newHistory,
            next_review_date: srsState.next_review_date,
            interval_days: srsState.interval_days,
            ease_factor: srsState.ease_factor,
            repetitions: srsState.repetitions,
          })
          .eq('id', analysis.existingErrorId)
        if (updErr) throw updErr

        setErrors((prev) =>
          prev.map((e) =>
            e.id === analysis.existingErrorId
              ? {
                  ...e,
                  occurrence_count: newCount,
                  history_notes: newHistory,
                  next_review_date: srsState.next_review_date,
                  interval_days: srsState.interval_days,
                  ease_factor: srsState.ease_factor,
                  repetitions: srsState.repetitions,
                }
              : e
          )
        )
      } else {
        const newError: ErrorEntry = {
          id: crypto.randomUUID(),
          question: notes,
          topic: analysis.suggestedCleanTitle,
          subtopic: null,
          area,
          error_reason: classifyErrorReason(notes),
          needs_review: false,
          reviewed: false,
          origem_atividade: null,
          nivel_confianca: 'medio',
          recorrencia: 1,
          ultima_ocorrencia: new Date().toISOString().split('T')[0],
          sugestao_revisao: null,
          next_review_date: new Date().toISOString(),
          interval_days: 1,
          ease_factor: 2.5,
          repetitions: 0,
          occurrence_count: 1,
          history_notes: [notes],
          flashcard_front: null,
          flashcard_back: null,
          created_at: new Date().toISOString(),
        }

        setErrors((prev) => [newError, ...prev])

        const { error: insErr } = await supabase
          .from('error_bank')
          .insert({ ...newError, user_id: user.id })
        if (insErr) throw insErr
      }
    } catch (err) {
      console.error('Error in addSmartError:', err)
    }
  }

  const addExtractedErrors = async (errorsToInsert: ErrorEntry[]) => {
    if (errorsToInsert.length === 0 || !user) return
    const previousErrors = errors
    setErrors((prev) => [...errorsToInsert, ...prev])
    try {
      const res = await supabase.from('error_bank').insert(
        errorsToInsert.map((e) => ({ ...e, user_id: user.id }))
      )
      if (res.error) throw res.error
    } catch (err) {
      setErrors(previousErrors)
      console.error('Error inserting extracted errors:', err)
    }
  }

  const persistFlashcard = async (id: string, front: string, back: string) => {
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, flashcard_front: front, flashcard_back: back } : e))
    )
    try {
      const res = await supabase
        .from('error_bank')
        .update({ flashcard_front: front, flashcard_back: back })
        .eq('id', id)
      if (res.error) throw res.error
    } catch (err) {
      console.error('Error persisting flashcard:', err)
    }
  }

  return { errors, loading, reviewErrorWithSRS, deleteError, addSmartError, addExtractedErrors, persistFlashcard }
}
