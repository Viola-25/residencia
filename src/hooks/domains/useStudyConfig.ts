import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { StudyConfig } from '../../types'

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

export function useStudyConfig() {
  const { user } = useAuth()
  const [config, setConfig] = useState<StudyConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('study_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then((res) => {
        if (res.data) setConfig(res.data as StudyConfig)
      })
      .catch((err) => {
        console.error('Error fetching study config:', err)
      })
      .finally(() => setLoading(false))
  }, [user])

  const updateConfig = async (newConfig: Partial<StudyConfig>) => {
    const updated = { ...config, ...newConfig }
    const previousConfig = config
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
    } catch (err) {
      setConfig(previousConfig)
      console.error('Error updating config:', err)
    }
  }

  return { config, loading, updateConfig }
}
