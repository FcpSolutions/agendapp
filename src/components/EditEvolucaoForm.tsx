import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

interface Evolucao {
  id: string
  patient_id: string
  data: string
  descricao: string
  created_at: string
  patient: {
    id: string
    nome: string
  }
}

interface EditEvolucaoFormProps {
  evolucao: Evolucao
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditEvolucaoForm({ evolucao, isOpen, onClose, onSuccess }: EditEvolucaoFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    data: evolucao.data,
    descricao: evolucao.descricao
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        data: evolucao.data,
        descricao: evolucao.descricao
      })
    }
  }, [isOpen, evolucao])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.data || !formData.descricao) {
      setError('Por favor, preencha todos os campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { error: updateError } = await supabase
        .from('evolucoes')
        .update({
          data: formData.data,
          descricao: formData.descricao
        })
        .eq('id', evolucao.id)
      
      if (updateError) throw updateError
      
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao atualizar evolução:', err)
      setError('Erro ao atualizar evolução')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
        <h2 className="text-lg font-semibold mb-4">Editar Evolução</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patient">Paciente</Label>
            <Input 
              id="patient" 
              value={evolucao.patient.nome} 
              disabled 
              className="bg-gray-100"
            />
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