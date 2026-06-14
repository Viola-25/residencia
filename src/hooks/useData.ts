import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type {
  DailyLog,
  DailyLogFormData,
  MockExam,
  MockExamFormData,
  ErrorEntry,
  ErrorEntryFormData,
  WeeklySummary,
  StudyConfig,
  AreaPerformance,
  MedicalArea,
  DashboardMetrics,
  StrategicData,
  AIInsight,
} from '../types'
import {
  calculateTotalQuestions,
  calculateTotalCorrect,
  calculateGlobalHitRate,
  calculateYearlyProgress,
  calculateWeeklyProgress,
  calculateEvolution,
  getMockTrend,
  calculateCurrentStreak,
  calculateDaysWithoutStudy,
  calculateApprovalScore,
  getAreaPriority,
} from '../lib/calculations'
import { getDaysUntil, getCurrentWeekStart } from '../lib/dates'

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
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [mocks, setMocks] = useState<MockExam[]>([])
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [areaPerformance, setAreaPerformance] = useState<AreaPerformance[]>([])
  const [config, setConfig] = useState<StudyConfig>(DEFAULT_CONFIG)
  const [weeklySummaries] = useState<WeeklySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [logsRes, mocksRes, errorsRes, areaRes, configRes] = await Promise.all([
          supabase.from('daily_logs').select('*').order('date', { ascending: false }),
          supabase.from('mock_exams').select('*').order('date', { ascending: false }),
          supabase.from('error_bank').select('*').order('created_at', { ascending: false }),
          supabase.from('area_performance').select('*'),
          supabase.from('study_config').select('*').limit(1).single(),
        ])

        if (logsRes.data) setLogs(logsRes.data as DailyLog[])
        if (mocksRes.data) setMocks(mocksRes.data as MockExam[])
        if (errorsRes.data) setErrors(errorsRes.data as ErrorEntry[])
        if (areaRes.data) setAreaPerformance(areaRes.data as AreaPerformance[])
        if (configRes.data) setConfig(configRes.data as StudyConfig)
      } catch {
        // Using local state when Supabase is not configured
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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
        saveAreaPerformance(area as MedicalArea, data.questions_done, data.correct)
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
      await supabase.from('daily_logs').insert(newLog)
    } catch { /* local fallback */ }
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
      await supabase.from('mock_exams').insert(newMock)
    } catch { /* local fallback */ }
  }

  const addError = async (formData: ErrorEntryFormData) => {
    const newError: ErrorEntry = {
      id: crypto.randomUUID(),
      ...formData,
      subtopic: formData.subtopic || null,
      reviewed: false,
      created_at: new Date().toISOString(),
    }
    setErrors((prev) => [newError, ...prev])
    try {
      await supabase.from('error_bank').insert(newError)
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
    const existing = areaPerformance.find((a) => a.area === area)
    const newPerf: AreaPerformance = {
      id: existing?.id || crypto.randomUUID(),
      area,
      questions_done: (existing?.questions_done || 0) + questions_done,
      correct: (existing?.correct || 0) + correct,
      hit_rate: 0,
      trend: 'stable',
      priority: getAreaPriority(hit_rate),
    }
    newPerf.hit_rate =
      newPerf.questions_done > 0
        ? Math.round((newPerf.correct / newPerf.questions_done) * 100 * 100) / 100
        : 0

    if (existing) {
      const oldRate = existing.hit_rate
      newPerf.trend = newPerf.hit_rate > oldRate ? 'up' : newPerf.hit_rate < oldRate ? 'down' : 'stable'
      setAreaPerformance((prev) => prev.map((a) => (a.area === area ? newPerf : a)))
    } else {
      setAreaPerformance((prev) => [...prev, newPerf])
    }

    try {
      await supabase.from('area_performance').upsert({
        ...newPerf,
        date: new Date().toISOString().split('T')[0],
      })
    } catch { /* local fallback */ }
  }

  const subtractAreaPerformance = async (area: MedicalArea, questions_done: number, correct: number) => {
    const existing = areaPerformance.find((a) => a.area === area)
    if (!existing) return
    const newQ = Math.max(0, existing.questions_done - questions_done)
    const newC = Math.max(0, existing.correct - correct)
    const hit_rate = newQ > 0 ? Math.round((newC / newQ) * 100 * 100) / 100 : 0
    const updated: AreaPerformance = {
      ...existing,
      questions_done: newQ,
      correct: newC,
      hit_rate,
      priority: getAreaPriority(hit_rate),
    }
    setAreaPerformance((prev) => prev.map((a) => (a.area === area ? updated : a)))
    try {
      await supabase.from('area_performance').upsert({
        ...updated,
        date: new Date().toISOString().split('T')[0],
      })
    } catch { /* local fallback */ }
  }

  const deleteDailyLog = async (id: string) => {
    const log = logs.find((l) => l.id === id)
    if (!log) return
    for (const ad of log.areas_data) {
      subtractAreaPerformance(ad.area, ad.questions_done, ad.correct)
    }
    setLogs((prev) => prev.filter((l) => l.id !== id))
    try {
      await supabase.from('daily_logs').delete().eq('id', id)
    } catch { /* local fallback */ }
  }

  const deleteMockExam = async (id: string) => {
    const exam = mocks.find((m) => m.id === id)
    if (!exam) return
    for (const ad of exam.areas_data) {
      subtractAreaPerformance(ad.area, ad.questions_done, ad.correct)
    }
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
        id: config.id === 'default' ? undefined : config.id,
      })
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

  const aiInsights = ((): AIInsight[] => {
    const insights: AIInsight[] = []
    const lowAreas = areaPerformance.filter((a) => a.priority === 'red')
    for (const area of lowAreas) {
      const global = calculateGlobalHitRate(logs)
      const diff = Math.round((global - area.hit_rate) * 100) / 100
      if (diff > 0) {
        insights.push({
          type: 'priority',
          title: 'Área prioritária detectada',
          description: `${area.area} apresenta desempenho ${diff.toFixed(1)}% inferior à média global. Recomenda-se aumentar o volume de questões desta área.`,
          priority: 'high',
          area: area.area,
        })
      }
    }
    if (dashboardMetrics.days_without_study > 2) {
      insights.push({
        type: 'suggestion',
        title: 'Retomar rotina de estudos',
        description: `Você está há ${dashboardMetrics.days_without_study} dias sem estudar. Que tal começar com uma revisão leve para retomar o ritmo?`,
        priority: 'high',
      })
    }
    if (mocks.length > 0) {
      const trend = getMockTrend(mocks)
      if (trend > 0) {
        insights.push({
          type: 'weekly',
          title: 'Evolução positiva em simulados',
          description: `Seus simulados apresentam tendência de crescimento de ${trend.toFixed(1)}%. Continue com a estratégia atual.`,
          priority: 'medium',
        })
      } else if (trend < 0) {
        insights.push({
          type: 'monthly',
          title: 'Atenção aos simulados',
          description: `Seus simulados apresentam tendência de queda de ${Math.abs(trend).toFixed(1)}%. Reavalie sua estratégia de preparação.`,
          priority: 'high',
        })
      }
    }
    if (insights.length === 0) {
      insights.push({
        type: 'suggestion',
        title: 'Comece a registrar seus estudos',
        description: 'Adicione seus registros diários, simulados e erros para receber insights personalizados.',
        priority: 'medium',
      })
    }
    return insights
  })()

  return {
    loading,
    logs,
    mocks,
    errors,
    areaPerformance,
    config,
    weeklySummaries,
    dashboardMetrics,
    approvalScore,
    strategicData,
    aiInsights,
    addDailyLog,
    addMockExam,
    addError,
    toggleErrorReview,
    saveAreaPerformance,
    deleteDailyLog,
    deleteMockExam,
    deleteError,
    updateConfig,
  }
}
