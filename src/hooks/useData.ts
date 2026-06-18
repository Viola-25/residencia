import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useDailyLogs } from './domains/useDailyLogs'
import { useMockExams } from './domains/useMockExams'
import { useErrorBank } from './domains/useErrorBank'
import { useStudyConfig } from './domains/useStudyConfig'
import type { MedicalArea, DashboardMetrics, StrategicData, MockExamFormData, DailyLogFormData, ErrorEntry } from '../types'
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
import { getDaysUntil, getCurrentWeekStart, getTodayDateString } from '../lib/dates'
import { extractErrorsFromNotesAI } from '../lib/groq'

export function useData() {
  const { user } = useAuth()

  const {
    logs,
    loading: logsLoading,
    addDailyLog: addDailyLogRaw,
    updateDailyLog,
    deleteDailyLog,
  } = useDailyLogs()

  const {
    mocks,
    loading: mocksLoading,
    addMockExam: addMockExamRaw,
    deleteMockExam,
  } = useMockExams()

  const {
    errors,
    loading: errorsLoading,
    toggleErrorReview,
    reviewErrorWithSRS,
    deleteError,
    addSmartError,
    addExtractedErrors,
  } = useErrorBank()

  const {
    config,
    loading: configLoading,
    updateConfig,
  } = useStudyConfig()

  const loading = logsLoading || mocksLoading || errorsLoading || configLoading

  const saveAreaPerformance = async (area: MedicalArea, questions_done: number, correct: number) => {
    const hit_rate = questions_done > 0 ? Math.round((correct / questions_done) * 100 * 100) / 100 : 0
    try {
      await supabase.from('area_performance').upsert({
        area,
        questions_done,
        correct,
        hit_rate,
        trend: 'stable',
        date: getTodayDateString(),
        user_id: user!.id,
      }, { onConflict: 'user_id,area' })
    } catch (err) {
      console.error('Error saving area performance:', err)
    }
  }

  const addDailyLog = async (formData: DailyLogFormData) => {
    const result = await addDailyLogRaw(formData)

    if (formData.notes && formData.notes.trim().length > 0) {
      const aiErrors = await extractErrorsFromNotesAI(formData.notes)
      const extractedErrorsRaw = aiErrors.length > 0
        ? aiErrors
        : extractErrorsFromNotes(formData.notes).map((e) => ({ ...e, sugestao_revisao: null as string | null }))

      const errorEntries: ErrorEntry[] = extractedErrorsRaw.map((ext) => ({
        id: crypto.randomUUID(),
        question: `[Auto: ${formData.date}] ${ext.topic}`,
        topic: ext.topic,
        subtopic: null,
        area: null,
        error_reason: ext.error_reason,
        needs_review: ext.nivel_confianca === 'baixo',
        reviewed: false,
        origem_atividade: result.newLog.id,
        nivel_confianca: ext.nivel_confianca,
        recorrencia: 1,
        ultima_ocorrencia: formData.date,
        sugestao_revisao: ext.sugestao_revisao,
        next_review_date: null,
        interval_days: 0,
        ease_factor: 2.5,
        repetitions: 0,
        occurrence_count: 1,
        history_notes: null,
        created_at: new Date().toISOString(),
      }))

      await addExtractedErrors(errorEntries)
    }
  }

  const addMockExam = async (formData: MockExamFormData) => {
    for (const [area, data] of Object.entries(formData.areas)) {
      if (data.questions_done > 0) {
        saveAreaPerformance(area as MedicalArea, data.questions_done, data.correct)
      }
    }
    await addMockExamRaw(formData)
  }

  const areaPerformance = useMemo(
    () => calculateAreaPerformanceFromLogs(logs),
    [logs]
  )

  const dashboardMetrics = useMemo((): DashboardMetrics => {
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
  }, [logs, config])

  const approvalScore = useMemo(
    () => calculateApprovalScore(logs, mocks, [], areaPerformance, errors),
    [logs, mocks, areaPerformance, errors]
  )

  const strategicData = useMemo((): StrategicData => {
    const sorted = [...areaPerformance].sort((a, b) => b.hit_rate - a.hit_rate)
    const topStrengths = sorted.slice(0, 3).map((a) => ({ area: a.area, hit_rate: a.hit_rate }))
    const sortedAsc = [...areaPerformance].sort((a, b) => a.hit_rate - b.hit_rate)
    const topWeaknesses = sortedAsc.slice(0, 3).map((a) => ({ area: a.area, hit_rate: a.hit_rate }))

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
      best_week: null,
    }
  }, [areaPerformance, dashboardMetrics])

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
    reviewErrorWithSRS,
    deleteDailyLog,
    updateDailyLog,
    deleteMockExam,
    deleteError,
    updateConfig,
    addSmartError,
    saveAreaPerformance,
  }
}
