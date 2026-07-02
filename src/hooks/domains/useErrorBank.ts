import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { ErrorEntry, MedicalArea } from '../../types'
import { calculateNextSRSState } from '../../lib/calculations'
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
        if (res.data) setErrors(res.data as ErrorEntry[])
      } catch (err) {
        console.error('Error fetching errors:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const toggleErrorReview = async (id: string) => {
    const previousErrors = errors
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, reviewed: !e.reviewed } : e))
    )
    const error = previousErrors.find((e) => e.id === id)
    if (error) {
      try {
        await supabase
          .from('error_bank')
          .update({ reviewed: !error.reviewed })
          .eq('id', id)
      } catch (err) {
        setErrors(previousErrors)
        console.error('Error toggling review:', err)
      }
    }
  }

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
      await supabase
        .from('error_bank')
        .update({
          reviewed: true,
          next_review_date: srsState.next_review_date,
          interval_days: srsState.interval_days,
          ease_factor: srsState.ease_factor,
          repetitions: srsState.repetitions,
        })
        .eq('id', id)
    } catch (err) {
      setErrors(previousErrors)
      console.error('Error updating SRS state:', err)
    }
  }

  const deleteError = async (id: string) => {
    const previousErrors = errors
    setErrors((prev) => prev.filter((e) => e.id !== id))
    try {
      await supabase.from('error_bank').delete().eq('id', id)
    } catch (err) {
      setErrors(previousErrors)
      console.error('Error deleting error:', err)
    }
  }

  const addSmartError = async (notes: string, area: MedicalArea) => {
    const { data: existing } = await supabase
      .from('error_bank')
      .select('id, topic')
      .eq('area', area)

    const analysis = await analyzeAndClusterError(notes, existing || [])

    if (analysis.isDuplicate && analysis.existingErrorId) {
      const { data: currentError } = await supabase
        .from('error_bank')
        .select('occurrence_count, history_notes, interval_days, ease_factor, repetitions')
        .eq('id', analysis.existingErrorId)
        .single()

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

      await supabase
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
        error_reason: 'Não sabia',
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
        created_at: new Date().toISOString(),
      }

      setErrors((prev) => [newError, ...prev])

      await supabase
        .from('error_bank')
        .insert({ ...newError, user_id: user!.id })
    }
  }

  const addExtractedErrors = async (errorsToInsert: ErrorEntry[]) => {
    if (errorsToInsert.length === 0) return
    const previousErrors = errors
    setErrors((prev) => [...errorsToInsert, ...prev])
    try {
      await supabase.from('error_bank').insert(
        errorsToInsert.map((e) => ({ ...e, user_id: user!.id }))
      )
    } catch (err) {
      setErrors(previousErrors)
      console.error('Error inserting extracted errors:', err)
    }
  }

  return { errors, loading, toggleErrorReview, reviewErrorWithSRS, deleteError, addSmartError, addExtractedErrors }
}
