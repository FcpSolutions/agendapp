import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditReceitaFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  receita: {
    id: string
    patient_id: string
    data: string
    tipo_pagamento: string
    operadora: string
    plano_saude: string
    valor: number
    observacoes: string
  }
}

export function EditReceitaForm({ isOpen, onClose, onSuccess, receita }: EditReceitaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    data: '',
    tipo_pagamento: '',
    operadora: '',
    plano_saude: '',
    valor: '',
    observacoes: ''
  })

  useEffect(() => {
    if (receita) {
      setFormData({
        data: receita.data.split('T')[0],
        tipo_pagamento: receita.tipo_pagamento,
        operadora: receita.operadora || '',
        plano_saude: receita.plano_saude || '',
        valor: receita.valor.toString(),
        observacoes: receita.observacoes || ''
      })
    }
  }, [receita])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { error } = await supabase
        .from('receitas')
        .update({
          data: formData.data,
          tipo_pagamento: formData.tipo_pagamento,
          operadora: formData.operadora,
          plano_saude: formData.plano_saude,
          valor: parseFloat(formData.valor),
          observacoes: formData.observacoes,
          user_id: user.id
        })
        .eq('id', receita.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao atualizar receita:', err)
      setError('Erro ao atualizar receita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Receita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              name="data"
              type="date"
              value={formData.data}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label>Tipo de Pagamento</Label>
            <RadioGroup
              value={formData.tipo_pagamento}
              onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_pagamento: value }))}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="particular" id="particular" />
                <Label htmlFor="particular">Particular</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="convenio" id="convenio" />
                <Label htmlFor="convenio">Convênio</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.tipo_pagamento === 'convenio' && (
            <>
              <div>
                <Label htmlFor="operadora">Operadora</Label>
                <Input
                  id="operadora"
                  name="operadora"
                  value={formData.operadora}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="plano_saude">Plano de Saúde</Label>
                <Input
                  id="plano_saude"
                  name="plano_saude"
                  value={formData.plano_saude}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              name="valor"
              type="number"
              step="0.01"
              value={formData.valor}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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