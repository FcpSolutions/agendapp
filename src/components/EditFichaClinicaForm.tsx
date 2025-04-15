import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

interface FichaClinica {
  id: string
  patient_id: string
  data_consulta: string
  queixa_principal: string
  diagnostico: string
  conduta: string
  observacoes: string
  created_at: string
  patient: {
    id: string
    nome: string
  }
}

interface EditFichaClinicaFormProps {
  ficha: FichaClinica
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditFichaClinicaForm({ ficha, isOpen, onClose, onSuccess }: EditFichaClinicaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    data_consulta: ficha.data_consulta,
    queixa_principal: ficha.queixa_principal,
    diagnostico: ficha.diagnostico,
    conduta: ficha.conduta,
    observacoes: ficha.observacoes
  })

  useEffect(() => {
    if (isOpen) {
      setFormData({
        data_consulta: ficha.data_consulta,
        queixa_principal: ficha.queixa_principal,
        diagnostico: ficha.diagnostico,
        conduta: ficha.conduta,
        observacoes: ficha.observacoes
      })
    }
  }, [isOpen, ficha])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.data_consulta || !formData.queixa_principal || !formData.diagnostico) {
      setError('Por favor, preencha todos os campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { error: updateError } = await supabase
        .from('fichas_clinicas')
        .update({
          data_consulta: formData.data_consulta,
          queixa_principal: formData.queixa_principal,
          diagnostico: formData.diagnostico,
          conduta: formData.conduta,
          observacoes: formData.observacoes
        })
        .eq('id', ficha.id)
      
      if (updateError) throw updateError
      
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao atualizar ficha clínica:', err)
      setError('Erro ao atualizar ficha clínica')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
        <h2 className="text-lg font-semibold mb-4">Editar Ficha Clínica</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patient">Paciente</Label>
            <Input 
              id="patient" 
              value={ficha.patient.nome} 
              disabled 
              className="bg-gray-100"
            />
          </div>
          
          <div>
            <Label htmlFor="data_consulta">Data da Consulta *</Label>
            <Input 
              id="data_consulta" 
              name="data_consulta" 
              type="date" 
              value={formData.data_consulta} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div>
            <Label htmlFor="queixa_principal">Queixa Principal *</Label>
            <Textarea 
              id="queixa_principal" 
              name="queixa_principal" 
              value={formData.queixa_principal} 
              onChange={handleChange} 
              required 
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="diagnostico">Diagnóstico *</Label>
            <Textarea 
              id="diagnostico" 
              name="diagnostico" 
              value={formData.diagnostico} 
              onChange={handleChange} 
              required 
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="conduta">Conduta</Label>
            <Textarea 
              id="conduta" 
              name="conduta" 
              value={formData.conduta} 
              onChange={handleChange} 
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea 
              id="observacoes" 
              name="observacoes" 
              value={formData.observacoes} 
              onChange={handleChange} 
              rows={3}
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