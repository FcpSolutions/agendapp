import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Register from './components/Register'
import { ForgotPassword } from './components/ForgotPassword'
import Dashboard from './components/Dashboard'

// Habilitar flags futuras do React Router
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
if (NavigationContext) {
  (NavigationContext as any).displayName = 'NavigationContext';
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escuta mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Carregando...</div>
  }

  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route
          path="/login"
          element={session ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={session ? <Navigate to="/dashboard" /> : <Register />}
        />
        <Route
          path="/forgot-password"
          element={session ? <Navigate to="/dashboard" /> : <ForgotPassword />}
        />

        {/* Rotas protegidas */}
        <Route
          path="/dashboard/*"
          element={session ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to={session ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </Router>
  )
}

export default App
