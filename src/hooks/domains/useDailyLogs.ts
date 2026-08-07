import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { DailyLog, DailyLogFormData, MedicalArea } from '../../types'
import { roundTo2, normalizeArea } from '../../lib/calculations'

function buildAreasData(formData: DailyLogFormData): {
  areas_data: { area: MedicalArea; questions_done: number; correct: number }[]
  totalQuestions: number
  totalCorrect: number
} {
  const areas_data: { area: MedicalArea; questions_done: number; correct: number }[] = []
  let totalQuestions = 0
  let totalCorrect = 0
  for (const [area, data] of Object.entries(formData.areas)) {
    if (data.questions_done > 0) {
      areas_data.push({
        area: normalizeArea(area),
        questions_done: data.questions_done,
        correct: data.correct,
      })
      totalQuestions += data.questions_done
      totalCorrect += data.correct
    }
  }
  return { areas_data, totalQuestions, totalCorrect }
}

export type LogMutationResult = {
  newLog: DailyLog
  formData: DailyLogFormData
}

export function useDailyLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const res = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
        if (res.data) setLogs(res.data as DailyLog[])
      } catch (err) {
        console.error('Error fetching daily logs:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const addDailyLog = async (formData: DailyLogFormData) => {
    const { areas_data, totalQuestions, totalCorrect } = buildAreasData(formData)

    const hit_rate = totalQuestions > 0
      ? roundTo2((totalCorrect / totalQuestions) * 100)
      : 0

    const scoreDelta = formData.platform_avg_rate !== null && totalQuestions > 0
      ? roundTo2(hit_rate - formData.platform_avg_rate)
      : null

    const newLog: DailyLog = {
      id: crypto.randomUUID(),
      date: formData.date,
      registration_type: formData.registration_type,
      hours_studied: formData.hours_studied,
      questions_done: totalQuestions,
      hit_rate,
      areas_data,
      core_review_done: formData.core_review_done,
      flashcards_done: formData.flashcards_done,
      notes: formData.notes || null,
      mood: formData.mood,
      energy_level: formData.energy_level,
      platform_avg_rate: formData.platform_avg_rate,
      platform_total_questions: formData.platform_total_questions,
      score_delta: scoreDelta,
      easy_correct: formData.easy_correct,
      easy_total: formData.easy_total,
      medium_correct: formData.medium_correct,
      medium_total: formData.medium_total,
      hard_correct: formData.hard_correct,
      hard_total: formData.hard_total,
      name: formData.name || null,
      ranking: formData.ranking ? Number(formData.ranking) : null,
      participants: formData.participants ? Number(formData.participants) : null,
      time_spent_minutes: formData.time_spent_minutes ? Number(formData.time_spent_minutes) : null,
      created_at: new Date().toISOString(),
    }

    const previousLogs = logs
    setLogs((prev) => [newLog, ...prev])

    try {
      await supabase.from('daily_logs').insert({ ...newLog, user_id: user!.id })
    } catch (err) {
      setLogs(previousLogs)
      console.error('Error inserting daily log:', err)
    }

    return { newLog, formData }
  }

  const updateDailyLog = async (id: string, formData: DailyLogFormData) => {
    const { areas_data, totalQuestions, totalCorrect } = buildAreasData(formData)

    const hit_rate = totalQuestions > 0
      ? roundTo2((totalCorrect / totalQuestions) * 100)
      : 0

    const scoreDelta = formData.platform_avg_rate !== null && totalQuestions > 0
      ? roundTo2(hit_rate - formData.platform_avg_rate)
      : null

    const updated: Partial<DailyLog> = {
      date: formData.date,
      registration_type: formData.registration_type,
      hours_studied: formData.hours_studied,
      questions_done: totalQuestions,
      hit_rate,
      areas_data,
      core_review_done: formData.core_review_done,
      flashcards_done: formData.flashcards_done,
      notes: formData.notes || null,
      mood: formData.mood,
      energy_level: formData.energy_level,
      platform_avg_rate: formData.platform_avg_rate,
      platform_total_questions: formData.platform_total_questions,
      score_delta: scoreDelta,
      easy_correct: formData.easy_correct,
      easy_total: formData.easy_total,
      medium_correct: formData.medium_correct,
      medium_total: formData.medium_total,
      hard_correct: formData.hard_correct,
      hard_total: formData.hard_total,
      name: formData.name || null,
      ranking: formData.ranking ? Number(formData.ranking) : null,
      participants: formData.participants ? Number(formData.participants) : null,
      time_spent_minutes: formData.time_spent_minutes ? Number(formData.time_spent_minutes) : null,
    }

    const previousLogs = logs
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)))

    try {
      await supabase.from('daily_logs').update(updated).eq('id', id)
    } catch (err) {
      setLogs(previousLogs)
      console.error('Error updating daily log:', err)
    }
  }

  const deleteDailyLog = async (id: string) => {
    const previousLogs = logs
    setLogs((prev) => prev.filter((l) => l.id !== id))
    try {
      await supabase.from('daily_logs').delete().eq('id', id)
    } catch (err) {
      setLogs(previousLogs)
      console.error('Error deleting daily log:', err)
    }
  }

  return { logs, loading, addDailyLog, updateDailyLog, deleteDailyLog }
}
