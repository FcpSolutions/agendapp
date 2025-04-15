import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface NewReceitaFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface Patient {
  id: string
  nome: string
}

export function NewReceitaForm({ isOpen, onClose, onSuccess }: NewReceitaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [formData, setFormData] = useState({
    patient_id: '',
    data: new Date().toISOString().split('T')[0],
    tipo_pagamento: 'particular',
    operadora: '',
    plano_saude: '',
    valor: '',
    observacoes: ''
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
      setError('Erro ao carregar lista de pacientes')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTipoPagamentoChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      tipo_pagamento: value,
      operadora: value === 'particular' ? '' : prev.operadora,
      plano_saude: value === 'particular' ? '' : prev.plano_saude
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.patient_id || !formData.data || !formData.valor) {
      setError('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (formData.tipo_pagamento === 'convenio' && (!formData.operadora || !formData.plano_saude)) {
      setError('Por favor, preencha os dados do convênio')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Formatar a data para o formato ISO
      const dataFormatada = new Date(formData.data).toISOString().split('T')[0]
      
      // Preparar os dados para inserção
      const dadosReceita = {
        patient_id: formData.patient_id,
        user_id: user.id,
        data: dataFormatada,
        tipo_pagamento: formData.tipo_pagamento,
        operadora: formData.operadora || null,
        plano_saude: formData.plano_saude || null,
        valor: parseFloat(formData.valor),
        observacoes: formData.observacoes || null
      }
      
      console.log('Dados a serem enviados:', dadosReceita)

      const { error } = await supabase
        .from('receitas')
        .insert(dadosReceita)

      if (error) {
        console.error('Erro detalhado:', error)
        throw error
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Erro ao criar receita:', err)
      setError('Erro ao criar receita: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient_id">Paciente *</Label>
            <Select
              value={formData.patient_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, patient_id: value }))}
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

          <div className="space-y-2">
            <Label htmlFor="data">Data *</Label>
            <Input
              type="date"
              id="data"
              name="data"
              value={formData.data}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Tipo de Pagamento *</Label>
            <RadioGroup
              value={formData.tipo_pagamento}
              onValueChange={handleTipoPagamentoChange}
              className="flex space-x-4 p-2 border rounded-md bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="particular" id="particular" className="border-primary-500 h-5 w-5" />
                <Label htmlFor="particular" className="font-medium text-base">Particular</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="convenio" id="convenio" className="border-primary-500 h-5 w-5" />
                <Label htmlFor="convenio" className="font-medium text-base">Convênio</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.tipo_pagamento === 'convenio' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="operadora">Operadora *</Label>
                <Input
                  type="text"
                  id="operadora"
                  name="operadora"
                  value={formData.operadora}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plano_saude">Plano de Saúde *</Label>
                <Input
                  type="text"
                  id="plano_saude"
                  name="plano_saude"
                  value={formData.plano_saude}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="valor">Valor *</Label>
            <Input
              type="number"
              id="valor"
              name="valor"
              value={formData.valor}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 