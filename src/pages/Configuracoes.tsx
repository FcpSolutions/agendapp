import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import { PerfilDocumentos } from '@/components/PerfilDocumentos'

export default function Configuracoes() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [formData, setFormData] = useState({
    nome_completo: '',
    crm: '',
    telefone: '',
    email: '',
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      const userEmail = user.email
      setFormData(prevData => ({ ...prevData, email: userEmail || '' }))

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Perfil não encontrado. Criando...')
          
          // Criar um novo perfil
          const { error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                nome_completo: '',
                crm: '',
                telefone: '',
                email: userEmail,
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single()

          if (createError) {
            console.error('Erro ao criar perfil:', createError)
            throw createError
          }

          setFormData({
            ...formData,
            nome_completo: '',
            crm: '',
            telefone: '',
            email: userEmail || ''
          })
          return
        }
        throw error
      }

      // Atualizar o formData com os dados do perfil e e-mail
      const updatedFormData = {
        nome_completo: data.nome_completo || '',
        crm: data.crm || '',
        telefone: data.telefone || '',
        email: userEmail || '',
        senha_atual: '',
        nova_senha: '',
        confirmar_senha: ''
      }
      
      setFormData(updatedFormData)
      console.log('FormData atualizado:', updatedFormData)
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
      toast.error('Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      const profileData = {
        id: user.id,
        nome_completo: formData.nome_completo,
        crm: formData.crm,
        telefone: formData.telefone,
        updated_at: new Date().toISOString()
      }

      console.log('Dados a serem salvos:', profileData)

      // Usar diretamente o upsert na tabela profiles
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()

      if (error) {
        console.error('Erro detalhado ao salvar:', error)
        throw error
      }

      console.log('Resposta do servidor:', data)
      toast.success('Perfil atualizado com sucesso')
      await fetchProfile() // Recarrega os dados após salvar
    } catch (err) {
      console.error('Erro ao salvar perfil:', err)
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      setSaving(true)

      if (formData.nova_senha !== formData.confirmar_senha) {
        toast.error('As senhas não coincidem')
        return
      }

      // Verificar a senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.senha_atual,
      })

      if (signInError) {
        toast.error('Senha atual incorreta')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.nova_senha
      })

      if (error) throw error

      toast.success('Senha alterada com sucesso')
      setIsChangePasswordOpen(false)
      setFormData({ ...formData, senha_atual: '', nova_senha: '', confirmar_senha: '' })
    } catch (err) {
      console.error('Erro ao alterar senha:', err)
      toast.error('Erro ao alterar senha')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      const { error } = await supabase.auth.admin.deleteUser(user.id)

      if (error) throw error

      await supabase.auth.signOut()
      navigate('/login')
      toast.success('Conta excluída com sucesso')
    } catch (err) {
      console.error('Erro ao excluir conta:', err)
      toast.error('Erro ao excluir conta')
    } finally {
      setSaving(false)
      setIsDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>
  }

  console.log('Renderizando componente com formData:', formData)

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>
      
      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="perfil">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e profissionais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome Completo</Label>
                <Input
                  id="nome_completo"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="crm">Registro Profissional</Label>
                <Input
                  id="crm"
                  value={formData.crm}
                  onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <div>
                <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)}>
                  Alterar Senha
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                  Excluir Conta
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="documentos">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Documentos Personalizados</CardTitle>
              <CardDescription>
                Configure seu papel timbrado e assinatura para uso em documentos e relatórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerfilDocumentos />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Escolha uma nova senha segura para sua conta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="senha_atual">Senha Atual</Label>
              <Input
                id="senha_atual"
                type="password"
                value={formData.senha_atual}
                onChange={(e) => setFormData({ ...formData, senha_atual: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova_senha">Nova Senha</Label>
              <Input
                id="nova_senha"
                type="password"
                value={formData.nova_senha}
                onChange={(e) => setFormData({ ...formData, nova_senha: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar_senha">Confirmar Nova Senha</Label>
              <Input
                id="confirmar_senha"
                type="password"
                value={formData.confirmar_senha}
                onChange={(e) => setFormData({ ...formData, confirmar_senha: e.target.value })}
              />
            </div>

            {formData.nova_senha && formData.confirmar_senha && formData.nova_senha !== formData.confirmar_senha && (
              <div className="text-red-500 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                As senhas não coincidem
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangePasswordOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={saving || !formData.senha_atual || !formData.nova_senha || !formData.confirmar_senha || (formData.nova_senha !== formData.confirmar_senha)}
            >
              {saving ? 'Salvando...' : 'Salvar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Conta</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá seus dados dos servidores.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <h4 className="font-semibold">Aviso Importante</h4>
                <p className="text-sm mt-1">
                  Todos os seus dados serão excluídos, incluindo pacientes, consultas, receitas e outros registros. Considere exportar seus dados antes de excluir sua conta.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 