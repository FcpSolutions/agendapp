import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Profile {
  id: string
  user_id: string
  nome: string
  especialidade?: string
  crm?: string
  assinatura_url?: string
  created_at: string
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        if (!user?.id) {
          setProfile(null)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) {
          throw error
        }

        setProfile(data)
      } catch (error: any) {
        console.error('Erro ao carregar perfil:', error.message)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  return { profile, loading, error }
} 