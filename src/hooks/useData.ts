import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useDailyLogs } from './domains/useDailyLogs'
import { useErrorBank } from './domains/useErrorBank'
import { useStudyConfig } from './domains/useStudyConfig'
import type { MedicalArea, DashboardMetrics, StrategicData, MockExam, DailyLog, DailyLogFormData, ErrorEntry } from '../types'
import {
  roundTo2,
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
  calculateWeeklySummaries,
  extractErrorsFromNotes,
  calculateRecentMetrics,
  RECENT_WINDOW_DAYS,
} from '../lib/calculations'
import { getDaysUntil, getCurrentWeekStart, getTodayDateString } from '../lib/dates'
import { extractErrorsFromNotesAI } from '../lib/groq'

export const RECENT_WINDOW_OPTIONS = [30, 60, 90] as const
export type RecentWindow = typeof RECENT_WINDOW_OPTIONS[number]

function logToMock(log: DailyLog): MockExam {
  return {
    id: log.id,
    date: log.date,
    name: log.name || 'Simulado',
    total_score: log.areas_data.reduce((s, a) => s + a.correct, 0),
    percentage: log.hit_rate,
    areas_data: log.areas_data,
    ranking: log.ranking,
    participants: log.participants,
    time_spent_minutes: log.time_spent_minutes,
    created_at: log.created_at,
  }
}

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

  const loading = logsLoading || errorsLoading || configLoading

  const [recentWindow, setRecentWindow] = useState<RecentWindow>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recentWindow')
      if (stored) {
        const parsed = Number(stored)
        if (RECENT_WINDOW_OPTIONS.includes(parsed as RecentWindow)) {
          return parsed as RecentWindow
        }
      }
    }
    return RECENT_WINDOW_DAYS
  })

  useEffect(() => {
    localStorage.setItem('recentWindow', String(recentWindow))
  }, [recentWindow])

  const saveAreaPerformance = async (area: MedicalArea, questions_done: number, correct: number) => {
    const hit_rate = questions_done > 0 ? roundTo2((correct / questions_done) * 100) : 0
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

  const mocks = useMemo(
    () =>
      logs
        .filter((l) => l.registration_type === 'simulado')
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(logToMock),
    [logs]
  )

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

  const weeklySummaries = useMemo(() => calculateWeeklySummaries(logs), [logs])

  const approvalScore = useMemo(
    () => calculateApprovalScore(logs, mocks, areaPerformance, errors),
    [logs, mocks, areaPerformance, errors]
  )

  const recentMetrics = useMemo(
    () => calculateRecentMetrics(logs, recentWindow),
    [logs, recentWindow]
  )

  const strategicData = useMemo((): StrategicData => {
    const sorted = [...areaPerformance].sort((a, b) => b.hit_rate - a.hit_rate)
    const topStrengths = sorted.slice(0, 3).map((a) => ({ area: a.area, hit_rate: a.hit_rate }))
    const sortedAsc = [...areaPerformance].sort((a, b) => a.hit_rate - b.hit_rate)
    const topWeaknesses = sortedAsc.slice(0, 3).map((a) => ({ area: a.area, hit_rate: a.hit_rate }))

    const recentByArea = new Map(
      recentMetrics.area_performance.map((a) => [a.area, a.hit_rate])
    )

    const deltas = areaPerformance
      .map((a) => {
        const recent = recentByArea.get(a.area)
        if (recent === undefined) return null
        return { area: a.area, delta: roundTo2(recent - a.hit_rate) }
      })
      .filter((d): d is { area: MedicalArea; delta: number } => d !== null)

    const mostGrowth = deltas.length > 0
      ? deltas.reduce((max, d) => (d.delta > max.delta ? d : max))
      : null
    const mostDecline = deltas.length > 0
      ? deltas.reduce((min, d) => (d.delta < min.delta ? d : min))
      : null

    return {
      top_strengths: topStrengths,
      top_weaknesses: topWeaknesses,
      most_growth:
        mostGrowth !== null && mostGrowth.delta > 0
          ? { area: mostGrowth.area, growth: mostGrowth.delta }
          : null,
      most_decline:
        mostDecline !== null && mostDecline.delta < 0
          ? { area: mostDecline.area, decline: Math.abs(mostDecline.delta) }
          : null,
      days_without_study: dashboardMetrics.days_without_study,
      current_streak: dashboardMetrics.current_streak,
      best_week:
        weeklySummaries.length > 0
          ? [...weeklySummaries].sort((a, b) => b.questions_done - a.questions_done)[0]
          : null,
    }
  }, [areaPerformance, dashboardMetrics, weeklySummaries, recentMetrics])

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
    recentMetrics,
    recentWindow,
    setRecentWindow,
    addDailyLog,
    toggleErrorReview,
    reviewErrorWithSRS,
    deleteDailyLog,
    updateDailyLog,
    deleteError,
    updateConfig,
    addSmartError,
    saveAreaPerformance,
  }
}
