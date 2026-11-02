import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type {
  ErrorEntry,
  MedicalArea,
  ReviewAttempt,
  ReviewRating,
  ReviewResult,
} from '../../types'
import { calculateNextQuestionSRSState, classifyErrorReason } from '../../lib/calculations'
import { analyzeAndClusterError } from '../../lib/groq'

export function useErrorBank() {
  const { user } = useAuth()
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [attempts, setAttempts] = useState<ReviewAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [errorsRes, attemptsRes] = await Promise.all([
          supabase
            .from('error_bank')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('review_attempts')
            .select('*')
            .eq('user_id', user.id)
            .order('answered_at', { ascending: false })
            .limit(500),
        ])
        if (errorsRes.error) throw errorsRes.error
        if (errorsRes.data) setErrors(errorsRes.data as ErrorEntry[])
        if (attemptsRes.data) setAttempts(attemptsRes.data as ReviewAttempt[])
      } catch (err) {
        console.error('Error fetching review data:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const submitReview = async (
    id: string,
    result: ReviewResult,
    rating: ReviewRating,
    chosenAnswerId: string | null = null
  ) => {
    const previousErrors = errors
    const error = previousErrors.find((e) => e.id === id)
    if (!error) return null

    const srsState = calculateNextQuestionSRSState(
      {
        interval_days: error.interval_days,
        ease_factor: error.ease_factor,
        repetitions: error.repetitions,
      },
      result,
      rating
    )
    const reviewedAt = new Date().toISOString()
    const reviewCount = (error.review_count || 0) + 1
    const correctCount = (error.correct_count || 0) + (result === 'correct' ? 1 : 0)
    const lapses = (error.lapses || 0) + (result === 'incorrect' ? 1 : 0)

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
              last_result: result,
              last_rating: rating,
              last_reviewed_at: reviewedAt,
              review_count: reviewCount,
              correct_count: correctCount,
              lapses,
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
          last_result: result,
          last_rating: rating,
          last_reviewed_at: reviewedAt,
          review_count: reviewCount,
          correct_count: correctCount,
          lapses,
        })
        .eq('id', id)
      if (res.error) throw res.error

      const attempt: ReviewAttempt = {
        id: crypto.randomUUID(),
        error_id: id,
        result,
        rating,
        chosen_answer_id: chosenAnswerId,
        interval_after: srsState.interval_days,
        ease_after: srsState.ease_factor,
        repetitions_after: srsState.repetitions,
        answered_at: reviewedAt,
      }
      setAttempts((prev) => [attempt, ...prev])

      if (user) {
        const attemptRes = await supabase
          .from('review_attempts')
          .insert({ ...attempt, user_id: user.id })
        if (attemptRes.error) {
          console.error('Error inserting review attempt:', attemptRes.error)
        }
      }

      return srsState
    } catch (err) {
      setErrors(previousErrors)
      console.error('Error updating SRS state:', err)
      return null
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

        const srsState = calculateNextQuestionSRSState(
          {
            interval_days: currentError?.interval_days ?? 0,
            ease_factor: currentError?.ease_factor ?? 2.5,
            repetitions: currentError?.repetitions ?? 0,
          },
          'incorrect',
          'hard'
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
          statement_html: null,
          alternatives: null,
          correct_answer_id: null,
          chosen_answer_id: null,
          tags: null,
          question_identifier: null,
          exam_name: null,
          exam_identifier: null,
          institution: null,
          question_year: null,
          take_home_message: null,
          overall_comment: null,
          platform_difficulty: null,
          success_rate: null,
          last_result: null,
          last_rating: null,
          last_reviewed_at: null,
          review_count: 0,
          correct_count: 0,
          lapses: 0,
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

  return {
    errors,
    attempts,
    loading,
    submitReview,
    deleteError,
    addSmartError,
    addExtractedErrors,
  }
}
