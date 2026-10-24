import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Buscar usuário atual ao inicializar
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('Erro ao buscar usuário:', error)
        setError(error.message)
      } else {
        setUser(data.user)
      }
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const { data: { subscription }} = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error }
} 