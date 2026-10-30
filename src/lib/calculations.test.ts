import { describe, it, expect } from 'vitest'
import {
  isErrorDue,
  calculateNextSRSState,
  calculateApprovalScore,
  calculateQuestionTypeBreakdown,
} from './calculations'
import type { DailyLog, ErrorEntry } from '../types'

function daysFromNow(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function makeError(overrides: Partial<ErrorEntry> = {}): ErrorEntry {
  return {
    id: crypto.randomUUID(),
    question: 'Enunciado de teste',
    topic: 'Tema',
    subtopic: null,
    area: 'clinica_medica',
    error_reason: 'Não sabia',
    needs_review: false,
    reviewed: false,
    origem_atividade: null,
    nivel_confianca: 'medio',
    recorrencia: 1,
    ultima_ocorrencia: null,
    sugestao_revisao: null,
    next_review_date: null,
    interval_days: 0,
    ease_factor: 2.5,
    repetitions: 0,
    occurrence_count: 1,
    history_notes: null,
    flashcard_front: null,
    flashcard_back: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as ErrorEntry
}

function makeLog(overrides: Partial<DailyLog> = {}): DailyLog {
  const today = new Date()
  const date = today.toISOString().slice(0, 10)
  return {
    id: crypto.randomUUID(),
    date,
    registration_type: 'questoes',
    name: null,
    questions_done: 10,
    hit_rate: 70,
    hours_studied: 0,
    mood: 'neutro',
    energy_level: 5,
    notes: null,
    areas_data: [],
    easy_correct: null,
    easy_total: null,
    medium_correct: null,
    medium_total: null,
    hard_correct: null,
    hard_total: null,
    platform_avg_rate: null,
    platform_total: null,
    score_delta: null,
    question_types: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as DailyLog
}

describe('isErrorDue', () => {
  it('vence quando a data agendada já passou, mesmo já revisado', () => {
    const err = makeError({ reviewed: true, next_review_date: daysFromNow(-1) })
    expect(isErrorDue(err)).toBe(true)
  })

  it('vence quando a data agendada é hoje', () => {
    const err = makeError({ reviewed: true, next_review_date: daysFromNow(0) })
    expect(isErrorDue(err)).toBe(true)
  })

  it('não vence quando a data é futura', () => {
    const err = makeError({ reviewed: true, next_review_date: daysFromNow(3) })
    expect(isErrorDue(err)).toBe(false)
  })

  it('sem data e sem revisão, vence', () => {
    expect(isErrorDue(makeError({ reviewed: false, next_review_date: null }))).toBe(true)
  })

  it('sem data e já revisado, não vence', () => {
    expect(isErrorDue(makeError({ reviewed: true, next_review_date: null }))).toBe(false)
  })
})

describe('calculateNextSRSState', () => {
  it('erro esquecido volta para 1 dia e zera repetições', () => {
    const r = calculateNextSRSState({ interval_days: 30, ease_factor: 2.5, repetitions: 4 }, 'forgot')
    expect(r.interval_days).toBe(1)
    expect(r.repetitions).toBe(0)
  })

  it('acerto bom segue a escada 2, 6, 15, 30', () => {
    const r0 = calculateNextSRSState({ interval_days: 0, ease_factor: 2.5, repetitions: 0 }, 'good')
    const r1 = calculateNextSRSState({ interval_days: r0.interval_days, ease_factor: r0.ease_factor, repetitions: r0.repetitions }, 'good')
    const r2 = calculateNextSRSState({ interval_days: r1.interval_days, ease_factor: r1.ease_factor, repetitions: r1.repetitions }, 'good')
    const r3 = calculateNextSRSState({ interval_days: r2.interval_days, ease_factor: r2.ease_factor, repetitions: r2.repetitions }, 'good')
    expect([r0.interval_days, r1.interval_days, r2.interval_days, r3.interval_days]).toEqual([2, 6, 15, 30])
  })

  it('fácil usa escada mais longa', () => {
    const r = calculateNextSRSState({ interval_days: 0, ease_factor: 2.5, repetitions: 0 }, 'easy')
    expect(r.interval_days).toBe(7)
  })

  it('ease factor fica entre 1.3 e 3.0', () => {
    let state = { interval_days: 1, ease_factor: 2.5, repetitions: 0 }
    for (let i = 0; i < 12; i++) state = calculateNextSRSState(state, 'forgot')
    expect(state.ease_factor).toBeGreaterThanOrEqual(1.3)

    let easyState = { interval_days: 1, ease_factor: 2.5, repetitions: 0 }
    for (let i = 0; i < 12; i++) easyState = calculateNextSRSState(easyState, 'easy')
    expect(easyState.ease_factor).toBeLessThanOrEqual(3.0)
  })

  it('agenda a próxima revisão para o intervalo calculado', () => {
    const r = calculateNextSRSState({ interval_days: 0, ease_factor: 2.5, repetitions: 0 }, 'good')
    expect(isErrorDue(makeError({ reviewed: true, next_review_date: r.next_review_date }))).toBe(false)
  })
})

describe('calculateApprovalScore', () => {
  it('revisão de erros = 60% revisados + 40% com flashcard', () => {
    const errors = [
      makeError({ reviewed: true, flashcard_front: 'f', flashcard_back: 'b', next_review_date: daysFromNow(5) }),
      makeError({ reviewed: true, flashcard_front: 'f', flashcard_back: 'b', next_review_date: daysFromNow(5) }),
      makeError({ reviewed: true, flashcard_front: null, flashcard_back: null, next_review_date: daysFromNow(5) }),
      makeError({ reviewed: false, next_review_date: daysFromNow(5) }),
    ]
    const score = calculateApprovalScore([], [], [], errors)
    expect(score.components.review_score).toBe(65)
  })

  it('banco de erros desconta os vencidos', () => {
    const errors = [
      makeError({ reviewed: true, next_review_date: daysFromNow(-2) }),
      makeError({ reviewed: true, next_review_date: daysFromNow(4) }),
      makeError({ reviewed: true, next_review_date: daysFromNow(4) }),
      makeError({ reviewed: true, next_review_date: daysFromNow(4) }),
    ]
    const score = calculateApprovalScore([], [], [], errors)
    expect(score.components.error_bank_score).toBe(75)
  })

  it('sem erros, revisão e banco ficam em zero', () => {
    const score = calculateApprovalScore([], [], [], [])
    expect(score.components.review_score).toBe(0)
    expect(score.components.error_bank_score).toBe(0)
  })
})

describe('calculateQuestionTypeBreakdown', () => {
  it('soma R1 e R+ separadamente e calcula a média ponderada da plataforma', () => {
    const logs = [
      makeLog({
        question_types: {
          direto: { c: 3, q: 4, avg: 50 },
          rplus: { c: 5, q: 6, avg: 70 },
        },
      }),
      makeLog({
        question_types: {
          direto: { c: 1, q: 2, avg: 80 },
          outros: { c: 0, q: 1, avg: null },
        },
      }),
    ]
    const [direto, rplus, outros] = calculateQuestionTypeBreakdown(logs)
    expect(direto.questions).toBe(6)
    expect(direto.correct).toBe(4)
    expect(direto.hit_rate).toBe(66.67)
    expect(direto.platform_avg).toBe(60)
    expect(rplus.questions).toBe(6)
    expect(rplus.correct).toBe(5)
    expect(outros.questions).toBe(1)
    expect(outros.platform_avg).toBeNull()
  })

  it('ignora logs sem a divisão por tipo', () => {
    const breakdown = calculateQuestionTypeBreakdown([makeLog({ question_types: null })])
    expect(breakdown.every((b) => b.questions === 0)).toBe(true)
    expect(breakdown.every((b) => b.hit_rate === null)).toBe(true)
  })
})
