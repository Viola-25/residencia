import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  DailyLog,
  DailyLogFormData,
  MockExam,
  MockExamFormData,
  ErrorEntry,
  ErrorReason,
  WeeklySummary,
  StudyConfig,
  MedicalArea,
  DashboardMetrics,
  StrategicData,
} from '../types'
import {
  calculateTotalQuestions,
  calculateTotalCorrect,
  calculateGlobalHitRate,
  calculateYearlyProgress,
  calculateWeeklyProgress,
  calculateEvolution,
  calculateCurrentStreak,
  calculateDaysWithoutStudy,
  calculateApprovalScore,
  calculateAreaPerformanceFromLogs,
  extractErrorsFromNotes,
} from '../lib/calculations'
import { getDaysUntil, getCurrentWeekStart } from '../lib/dates'
import { extractErrorsFromNotesAI, analyzeInlineError } from '../lib/groq'

const DEFAULT_CONFIG: StudyConfig = {
  id: 'default',
  enamed_date: '2026-10-18',
  first_exam_date: '2026-10-25',
  yearly_goal: 10000,
  weekly_goal: 200,
  monthly_goal: 800,
  mock_goal_per_week: 1,
  daily_hours_goal: 4,
  daily_questions_goal: 40,
}

export function useData() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [mocks, setMocks] = useState<MockExam[]>([])
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [config, setConfig] = useState<StudyConfig>(DEFAULT_CONFIG)
  const [weeklySummaries] = useState<WeeklySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [logsRes, mocksRes, errorsRes, configRes] = await Promise.all([
          supabase.from('daily_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
          supabase.from('mock_exams').select('*').eq('user_id', user.id).order('date', { ascending: false }),
          supabase.from('error_bank').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('study_config').select('*').eq('user_id', user.id).limit(1).single(),
        ])

        if (logsRes.data) setLogs(logsRes.data as DailyLog[])
        if (mocksRes.data) setMocks(mocksRes.data as MockExam[])
        if (errorsRes.data) setErrors(errorsRes.data as ErrorEntry[])
        if (configRes.data) setConfig(configRes.data as StudyConfig)
      } catch {
        // Using local state when Supabase is not configured
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const areaPerformance = useMemo(
    () => calculateAreaPerformanceFromLogs(logs),
    [logs]
  )

  const addDailyLog = async (formData: DailyLogFormData) => {
    const areas_data: { area: MedicalArea; questions_done: number; correct: number }[] = []
    let totalQuestions = 0
    let totalCorrect = 0
    for (const [area, data] of Object.entries(formData.areas)) {
      if (data.questions_done > 0) {
        areas_data.push({
          area: area as MedicalArea,
          questions_done: data.questions_done,
          correct: data.correct,
        })
        totalQuestions += data.questions_done
        totalCorrect += data.correct
      }
    }

    const hit_rate = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100
      : 0

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
      created_at: new Date().toISOString(),
    }
    setLogs((prev) => [newLog, ...prev])
    try {
      await supabase.from('daily_logs').insert({ ...newLog, user_id: user!.id })
    } catch { /* local fallback */ }

    // Save inline errors with AI analysis
    const inlineTopics: string[] = []
    if (formData.inline_errors && formData.inline_errors.length > 0) {
      for (const ie of formData.inline_errors) {
        if (!ie.topic.trim()) continue
        inlineTopics.push(ie.topic.toLowerCase())

        const analysis = await analyzeInlineError({
          topic: ie.topic,
          enunciado: ie.enunciado,
          alternativa_selecionada: ie.alternativa_selecionada,
          alternativa_certa: ie.alternativa_certa,
          error_reason: ie.error_reason,
        })

        const newError: ErrorEntry = {
          id: crypto.randomUUID(),
          question: `[Registro: ${formData.date}] ${ie.enunciado || ie.topic}${ie.alternativa_selecionada ? ` | Selecionou: ${ie.alternativa_selecionada}` : ''}${ie.alternativa_certa ? ` | Correto: ${ie.alternativa_certa}` : ''}`,
          topic: ie.topic,
          subtopic: null,
          error_reason: analysis.error_reason_sugerido as ErrorReason,
          needs_review: false,
          reviewed: false,
          origem_atividade: newLog.id,
          nivel_confianca: 'medio',
          recorrencia: 1,
          ultima_ocorrencia: formData.date,
          sugestao_revisao: analysis.sugestao_revisao,
          created_at: new Date().toISOString(),
        }
        setErrors((prev) => [newError, ...prev])
        try {
          await supabase.from('error_bank').insert({ ...newError, user_id: user!.id })
        } catch { /* local fallback */ }
      }
    }

    // Auto-extract errors from notes (AI first, regex fallback)
    if (formData.notes && formData.notes.trim().length > 0) {
      const aiErrors = await extractErrorsFromNotesAI(formData.notes)
      const extractedErrors = aiErrors.length > 0
        ? aiErrors
        : extractErrorsFromNotes(formData.notes).map((e) => ({ ...e, sugestao_revisao: null as string | null }))

      for (const ext of extractedErrors) {
        if (inlineTopics.includes(ext.topic.toLowerCase())) continue

        const newError: ErrorEntry = {
          id: crypto.randomUUID(),
          question: `[Auto: ${formData.date}] ${ext.topic}`,
          topic: ext.topic,
          subtopic: null,
          error_reason: ext.error_reason,
          needs_review: ext.nivel_confianca === 'baixo',
          reviewed: false,
          origem_atividade: newLog.id,
          nivel_confianca: ext.nivel_confianca,
          recorrencia: 1,
          ultima_ocorrencia: formData.date,
          sugestao_revisao: ext.sugestao_revisao,
          created_at: new Date().toISOString(),
        }
        setErrors((prev) => [newError, ...prev])
        try {
          await supabase.from('error_bank').insert({ ...newError, user_id: user!.id })
        } catch { /* local fallback */ }
      }
    }
  }

  const addMockExam = async (formData: MockExamFormData) => {
    const areas_data: { area: MedicalArea; questions_done: number; correct: number }[] = []
    let totalQuestions = 0
    let totalCorrect = 0
    for (const [area, data] of Object.entries(formData.areas)) {
      if (data.questions_done > 0) {
        areas_data.push({
          area: area as MedicalArea,
          questions_done: data.questions_done,
          correct: data.correct,
        })
        totalQuestions += data.questions_done
        totalCorrect += data.correct
        saveAreaPerformance(area as MedicalArea, data.questions_done, data.correct)
      }
    }

    const percentage = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100
      : 0

    const newMock: MockExam = {
      id: crypto.randomUUID(),
      date: formData.date,
      name: formData.name,
      total_score: totalCorrect,
      percentage,
      areas_data,
      ranking: formData.ranking ? Number(formData.ranking) : null,
      participants: formData.participants ? Number(formData.participants) : null,
      time_spent_minutes: formData.time_spent_minutes ? Number(formData.time_spent_minutes) : null,
      created_at: new Date().toISOString(),
    }
    setMocks((prev) => [newMock, ...prev])
    try {
      await supabase.from('mock_exams').insert({ ...newMock, user_id: user!.id })
    } catch { /* local fallback */ }
  }

  const toggleErrorReview = async (id: string) => {
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, reviewed: !e.reviewed } : e))
    )
    const error = errors.find((e) => e.id === id)
    if (error) {
      try {
        await supabase
          .from('error_bank')
          .update({ reviewed: !error.reviewed })
          .eq('id', id)
      } catch { /* local fallback */ }
    }
  }

  const saveAreaPerformance = async (area: MedicalArea, questions_done: number, correct: number) => {
    const hit_rate = questions_done > 0 ? Math.round((correct / questions_done) * 100 * 100) / 100 : 0
    try {
      await supabase.from('area_performance').upsert({
        area,
        questions_done,
        correct,
        hit_rate,
        trend: 'stable',
        date: new Date().toISOString().split('T')[0],
        user_id: user!.id,
      }, { onConflict: 'area' })
    } catch { /* local fallback */ }
  }

  const deleteDailyLog = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id))
    try {
      await supabase.from('daily_logs').delete().eq('id', id)
    } catch { /* local fallback */ }
  }

  const deleteMockExam = async (id: string) => {
    setMocks((prev) => prev.filter((m) => m.id !== id))
    try {
      await supabase.from('mock_exams').delete().eq('id', id)
    } catch { /* local fallback */ }
  }

  const deleteError = async (id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id))
    try {
      await supabase.from('error_bank').delete().eq('id', id)
    } catch { /* local fallback */ }
  }

  const updateConfig = async (newConfig: Partial<StudyConfig>) => {
    const updated = { ...config, ...newConfig }
    setConfig(updated)
    try {
      await supabase.from('study_config').upsert({
        enamed_date: updated.enamed_date,
        first_exam_date: updated.first_exam_date,
        yearly_goal: updated.yearly_goal,
        weekly_goal: updated.weekly_goal,
        monthly_goal: updated.monthly_goal,
        mock_goal_per_week: updated.mock_goal_per_week,
        daily_hours_goal: updated.daily_hours_goal,
        daily_questions_goal: updated.daily_questions_goal,
        user_id: user!.id,
        id: config.id === 'default' ? undefined : config.id,
      }, { onConflict: 'user_id' })
    } catch { /* local fallback */ }
  }

  const dashboardMetrics = ((): DashboardMetrics => {
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date))
    return {
      days_to_enamed: getDaysUntil(config.enamed_date),
      days_to_first_exam: getDaysUntil(config.first_exam_date),
      total_questions: calculateTotalQuestions(sortedLogs),
      total_correct: calculateTotalCorrect(sortedLogs),
      global_hit_rate: calculateGlobalHitRate(sortedLogs),
      yearly_progress: calculateYearlyProgress(sortedLogs, config.yearly_goal),
      weekly_progress: calculateWeeklyProgress(sortedLogs, config.weekly_goal, getCurrentWeekStart()),
      evolution_percentage: calculateEvolution(sortedLogs),
      current_streak: calculateCurrentStreak(sortedLogs),
      days_without_study: calculateDaysWithoutStudy(sortedLogs),
    }
  })()

  const approvalScore = calculateApprovalScore(logs, mocks, weeklySummaries, areaPerformance)

  const strategicData = ((): StrategicData => {
    const sorted = [...areaPerformance].sort((a, b) => b.hit_rate - a.hit_rate)
    const topStrengths = sorted.slice(0, 3).map((a) => ({ area: a.area, hit_rate: a.hit_rate }))
    const topWeaknesses = sorted.reverse().slice(0, 3).map((a) => ({ area: a.area, hit_rate: a.hit_rate }))

    const growthAreas = areaPerformance.filter((a) => a.trend === 'up')
    const declineAreas = areaPerformance.filter((a) => a.trend === 'down')
    const globalAvg = areaPerformance.length > 0
      ? areaPerformance.reduce((s, a) => s + a.hit_rate, 0) / areaPerformance.length
      : 0
    const mostGrowth = growthAreas.length > 0
      ? { area: growthAreas[0].area, growth: Math.round(Math.abs(growthAreas[0].hit_rate - globalAvg) * 100) / 100 }
      : null
    const mostDecline = declineAreas.length > 0
      ? { area: declineAreas[0].area, decline: Math.round(Math.abs(declineAreas[0].hit_rate - globalAvg) * 100) / 100 }
      : null

    return {
      top_strengths: topStrengths,
      top_weaknesses: topWeaknesses,
      most_growth: mostGrowth,
      most_decline: mostDecline,
      days_without_study: dashboardMetrics.days_without_study,
      current_streak: dashboardMetrics.current_streak,
      best_week: weeklySummaries.length > 0
        ? weeklySummaries.reduce((best, w) => (w.questions_done > best.questions_done ? w : best))
        : null,
    }
  })()

  return {
    loading,
    logs,
    mocks,
    errors,
    areaPerformance,
    config,
    dashboardMetrics,
    approvalScore,
    strategicData,
    addDailyLog,
    addMockExam,
    toggleErrorReview,
    deleteDailyLog,
    deleteMockExam,
    deleteError,
    updateConfig,
  }
}
