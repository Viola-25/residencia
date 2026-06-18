import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { MockExam, MockExamFormData, MedicalArea } from '../../types'

function buildAreasData(formData: MockExamFormData): {
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
        area: area as MedicalArea,
        questions_done: data.questions_done,
        correct: data.correct,
      })
      totalQuestions += data.questions_done
      totalCorrect += data.correct
    }
  }
  return { areas_data, totalQuestions, totalCorrect }
}

export function useMockExams() {
  const { user } = useAuth()
  const [mocks, setMocks] = useState<MockExam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('mock_exams')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .then((res) => {
        if (res.data) setMocks(res.data as MockExam[])
      })
      .catch((err) => {
        console.error('Error fetching mock exams:', err)
      })
      .finally(() => setLoading(false))
  }, [user])

  const addMockExam = async (formData: MockExamFormData) => {
    const { areas_data, totalQuestions, totalCorrect } = buildAreasData(formData)

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
    } catch (err) {
      console.error('Error inserting mock exam:', err)
    }
  }

  const deleteMockExam = async (id: string) => {
    setMocks((prev) => prev.filter((m) => m.id !== id))
    try {
      await supabase.from('mock_exams').delete().eq('id', id)
    } catch (err) {
      console.error('Error deleting mock exam:', err)
    }
  }

  return { mocks, loading, addMockExam, deleteMockExam }
}
