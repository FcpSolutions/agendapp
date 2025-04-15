import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validações básicas
    if (!email.trim()) {
      setError('O email é obrigatório');
      return;
    }
    
    if (!password.trim()) {
      setError('A senha é obrigatória');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setLoading(true)
    setError(null)

    try {
      console.log('Iniciando registro com:', { email });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      })
      
      console.log('Resposta do registro:', { data, error });
      
      if (error) {
        console.error('Erro no registro:', error);
        throw error;
      }
      
      setShowConfirmDialog(true)
    } catch (error: any) {
      console.error('Erro capturado no registro:', error);
      
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      // Tratamento específico para erros comuns
      if (error.message) {
        if (error.message.includes('email')) {
          errorMessage = 'Email inválido ou já está em uso. Verifique e tente novamente.';
        } else if (error.message.includes('password')) {
          errorMessage = 'Senha inválida. A senha deve ter pelo menos 6 caracteres.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Criar Conta</CardTitle>
            <CardDescription>Registre-se para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                />
                <p className="text-xs text-gray-500">A senha deve ter pelo menos 6 caracteres</p>
              </div>
              {error && (
                <div className="text-sm text-red-500 p-2 bg-red-50 rounded-md">{error}</div>
              )}
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              variant="link" 
              className="text-sm"
              onClick={() => window.location.href = '/login'}
            >
              Já tem uma conta? Faça login
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirme seu email</DialogTitle>
            <DialogDescription className="text-gray-300">
              Enviamos um link de confirmação para {email}. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col space-y-2">
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full bg-white text-gray-900 hover:bg-gray-100"
            >
              Ir para o login
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-white text-white hover:bg-gray-800"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 