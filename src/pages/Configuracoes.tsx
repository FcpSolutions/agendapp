import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  nome_completo: string | null
  crm: string | null
  telefone: string | null
  email: string | null
}

export default function Configuracoes() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Erro ao obter usuário:', userError)
        toast.error('Erro ao obter usuário')
        return
      }
      
      if (!user) {
        navigate('/login')
        return
      }

      // Obter o e-mail diretamente do usuário autenticado
      const userEmail = user.email

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // Se o perfil não existir, vamos criá-lo
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                nome_completo: '',
                crm: '',
                telefone: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single()

          if (createError) {
            console.error('Erro ao criar perfil:', createError)
            throw createError
          }

          setProfile(newProfile)
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

      setProfile(data)
      
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais e preferências</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>
            Atualize suas informações de perfil
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
            <Label htmlFor="crm">CRM</Label>
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

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis para sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Excluir Conta
          </Button>
        </CardContent>
      </Card>

      {/* Modal de Alteração de Senha */}
      <AlertDialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Digite sua senha atual e a nova senha abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>

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
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsChangePasswordOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Alterando...' : 'Alterar Senha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
              e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Excluindo...' : 'Sim, excluir conta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 