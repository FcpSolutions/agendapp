import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface NewPatientFormProps {
  onClose: () => void
  isOpen: boolean
  editingPatient?: {
    id: string
    nome: string
    cpf: string
    data_nascimento: string
    email: string
    telefone: string
    endereco: {
      cep: string
      logradouro: string
      bairro: string
      cidade: string
      estado: string
      numero: string
      complemento: string
    }
  } | null
}

interface Endereco {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  estado: string
  numero: string
  complemento: string
}

export function NewPatientForm({ onClose, isOpen, editingPatient }: NewPatientFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    email: '',
    telefone: '',
    endereco: {
      cep: '',
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: '',
      numero: '',
      complemento: ''
    }
  })

  // Preencher o formulário com os dados do paciente quando estiver editando
  useEffect(() => {
    if (editingPatient) {
      setFormData({
        nome: editingPatient.nome,
        cpf: editingPatient.cpf || '',
        data_nascimento: editingPatient.data_nascimento || '',
        email: editingPatient.email,
        telefone: editingPatient.telefone,
        endereco: editingPatient.endereco || {
          cep: '',
          logradouro: '',
          bairro: '',
          cidade: '',
          estado: '',
          numero: '',
          complemento: ''
        }
      })
    } else {
      // Resetar o formulário quando não estiver editando
      setFormData({
        nome: '',
        cpf: '',
        data_nascimento: '',
        email: '',
        telefone: '',
        endereco: {
          cep: '',
          logradouro: '',
          bairro: '',
          cidade: '',
          estado: '',
          numero: '',
          complemento: ''
        }
      })
    }
  }, [editingPatient])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name.startsWith('endereco.')) {
      const enderecoField = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          [enderecoField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const buscarCep = async (cep: string) => {
    if (cep.length !== 8) return
    
    try {
      setLoading(true)
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()
      
      if (data.erro) {
        setError('CEP não encontrado')
        return
      }
      
      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf
        }
      }))
    } catch (error) {
      setError('Erro ao buscar CEP')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    const cepLimpo = value.replace(/\D/g, '')
    
    setFormData(prev => ({
      ...prev,
      endereco: {
        ...prev.endereco,
        cep: cepLimpo
      }
    }))
    
    if (cepLimpo.length === 8) {
      buscarCep(cepLimpo)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      if (editingPatient) {
        // Atualizar paciente existente
        const { error } = await supabase
          .from('patients')
          .update({
            ...formData,
            user_id: user.id
          })
          .eq('id', editingPatient.id)

        if (error) throw error
      } else {
        // Inserir novo paciente
        const { error } = await supabase
          .from('patients')
          .insert([{
            ...formData,
            user_id: user.id
          }])

        if (error) throw error
      }

      onClose()
    } catch (error: any) {
      setError(`Erro ao ${editingPatient ? 'atualizar' : 'adicionar'} paciente. Tente novamente.`)
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                placeholder="Nome do paciente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                required
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                name="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                required
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-md font-medium mb-4">Endereço</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="endereco.cep">CEP</Label>
                  <Input
                    id="endereco.cep"
                    name="endereco.cep"
                    value={formData.endereco.cep}
                    onChange={handleCepChange}
                    required
                    placeholder="00000-000"
                    maxLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco.logradouro">Logradouro</Label>
                  <Input
                    id="endereco.logradouro"
                    name="endereco.logradouro"
                    value={formData.endereco.logradouro}
                    onChange={handleChange}
                    required
                    placeholder="Rua, Avenida, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endereco.numero">Número</Label>
                    <Input
                      id="endereco.numero"
                      name="endereco.numero"
                      value={formData.endereco.numero}
                      onChange={handleChange}
                      required
                      placeholder="Número"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco.complemento">Complemento</Label>
                    <Input
                      id="endereco.complemento"
                      name="endereco.complemento"
                      value={formData.endereco.complemento}
                      onChange={handleChange}
                      placeholder="Apto, Bloco, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco.bairro">Bairro</Label>
                  <Input
                    id="endereco.bairro"
                    name="endereco.bairro"
                    value={formData.endereco.bairro}
                    onChange={handleChange}
                    required
                    placeholder="Bairro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endereco.cidade">Cidade</Label>
                    <Input
                      id="endereco.cidade"
                      name="endereco.cidade"
                      value={formData.endereco.cidade}
                      onChange={handleChange}
                      required
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco.estado">Estado</Label>
                    <Input
                      id="endereco.estado"
                      name="endereco.estado"
                      value={formData.endereco.estado}
                      onChange={handleChange}
                      required
                      placeholder="Estado"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (editingPatient ? 'Atualizando...' : 'Adicionando...') : (editingPatient ? 'Atualizar Paciente' : 'Adicionar Paciente')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 