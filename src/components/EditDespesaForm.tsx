import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EditDespesaFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  despesa: {
    id: string
    descricao: string
    data: string
    valor: number
    categoria: string
    forma_pagamento: string
    observacoes: string | null
  }
}

export function EditDespesaForm({ isOpen, onClose, onSuccess, despesa }: EditDespesaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    descricao: '',
    data: '',
    valor: '',
    categoria: '',
    forma_pagamento: '',
    observacoes: ''
  })

  useEffect(() => {
    if (despesa) {
      setFormData({
        descricao: despesa.descricao,
        data: despesa.data.split('T')[0],
        valor: despesa.valor.toString(),
        categoria: despesa.categoria,
        forma_pagamento: despesa.forma_pagamento,
        observacoes: despesa.observacoes || ''
      })
    }
  }, [despesa])

  const categorias = [
    'Material de Escritório',
    'Equipamentos',
    'Serviços',
    'Impostos',
    'Aluguel',
    'Água',
    'Luz',
    'Internet',
    'Telefone',
    'Outros'
  ]

  const formasPagamento = [
    'Dinheiro',
    'Cartão de Débito',
    'Cartão de Crédito',
    'PIX',
    'Transferência',
    'Boleto'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const [ano, mes, dia] = formData.data.split('-')
      const dataFormatada = `${ano}-${mes}-${dia}`

      const { error } = await supabase
        .from('despesas')
        .update({
          descricao: formData.descricao,
          data: dataFormatada,
          valor: parseFloat(formData.valor),
          categoria: formData.categoria,
          forma_pagamento: formData.forma_pagamento,
          observacoes: formData.observacoes || null,
          user_id: user.id
        })
        .eq('id', despesa.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao atualizar despesa:', err)
      setError('Erro ao atualizar despesa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Despesa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Data *</Label>
            <Input
              id="data"
              name="data"
              type="date"
              value={formData.data}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <Select
              value={formData.categoria}
              onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map(categoria => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
            <Select
              value={formData.forma_pagamento}
              onValueChange={(value) => setFormData(prev => ({ ...prev, forma_pagamento: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {formasPagamento.map(forma => (
                  <SelectItem key={forma} value={forma}>
                    {forma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor *</Label>
            <Input
              id="valor"
              name="valor"
              type="number"
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={handleInputChange}
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