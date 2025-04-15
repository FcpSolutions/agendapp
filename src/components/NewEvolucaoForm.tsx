import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from './ui/textarea'

interface Patient {
  id: string
  nome: string
}

interface NewEvolucaoFormProps {
  isOpen: boolean
  onClose: () => void
}

export function NewEvolucaoForm({ isOpen, onClose }: NewEvolucaoFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [formData, setFormData] = useState({
    patient_id: '',
    data: '',
    descricao: ''
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, nome')
        .order('nome')
      
      if (error) throw error
      
      setPatients(data || [])
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, patient_id: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.patient_id || !formData.data || !formData.descricao) {
      setError('Por favor, preencha todos os campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Usuário não autenticado')
      
      const { error: insertError } = await supabase
        .from('evolucoes')
        .insert({
          patient_id: formData.patient_id,
          user_id: user.id,
          data: formData.data,
          descricao: formData.descricao
        })
      
      if (insertError) throw insertError
      
      onClose()
    } catch (err) {
      console.error('Erro ao adicionar evolução:', err)
      setError('Erro ao adicionar evolução')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
        <h2 className="text-lg font-semibold mb-4">Nova Evolução</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patient_id">Paciente *</Label>
            <Select 
              value={formData.patient_id} 
              onValueChange={handleSelectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="data">Data *</Label>
            <Input 
              id="data" 
              name="data" 
              type="date" 
              value={formData.data} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div>
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea 
              id="descricao" 
              name="descricao" 
              value={formData.descricao} 
              onChange={handleChange} 
              required 
              rows={5}
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
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
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 