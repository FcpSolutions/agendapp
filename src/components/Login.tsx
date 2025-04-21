import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <Card className="w-[380px] border-none shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="text-2xl font-bold text-center text-blue-600 bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
            Dr. Consulta
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Entre com sua conta para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{error}</div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-md transition-all duration-300"
              disabled={loading}
            >
              {loading ? 'Carregando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 pt-0">
          <Button 
            variant="link" 
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={() => window.location.href = '/forgot-password'}
          >
            Esqueceu sua senha?
          </Button>
          <Button 
            variant="link" 
            className="text-sm text-blue-600 hover:text-blue-700"
            onClick={() => window.location.href = '/register'}
          >
            Não tem uma conta? Registre-se
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 