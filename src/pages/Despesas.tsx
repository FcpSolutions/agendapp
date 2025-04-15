import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NewDespesaForm } from '@/components/NewDespesaForm'
import { EditDespesaForm } from '@/components/EditDespesaForm'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Despesa {
  id: string
  descricao: string
  data: string
  valor: number
  categoria: string
  forma_pagamento: string
  observacoes: string | null
  created_at: string
}

export default function Despesas() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [filteredDespesas, setFilteredDespesas] = useState<Despesa[]>([])
  const [isNewDespesaOpen, setIsNewDespesaOpen] = useState(false)
  const [isEditDespesaOpen, setIsEditDespesaOpen] = useState(false)
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDespesas()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDespesas(despesas)
    } else {
      const filtered = despesas.filter(despesa => 
        despesa.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        despesa.categoria.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredDespesas(filtered)
    }
  }, [searchTerm, despesas])

  const fetchDespesas = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .order('data', { ascending: false })

      if (error) throw error

      setDespesas(data || [])
      setFilteredDespesas(data || [])
    } catch (err) {
      console.error('Erro ao buscar despesas:', err)
      setError('Não foi possível carregar as despesas')
    } finally {
      setLoading(false)
    }
  }

  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.split('-')
    return format(new Date(Number(ano), Number(mes) - 1, Number(dia)), 'dd/MM/yyyy', { locale: ptBR })
  }

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('despesas')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchDespesas()
    } catch (err) {
      console.error('Erro ao excluir despesa:', err)
      setError('Não foi possível excluir a despesa')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (despesa: Despesa) => {
    setSelectedDespesa(despesa)
    setIsEditDespesaOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas</h1>
        <Button 
          onClick={() => setIsNewDespesaOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nova Despesa
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou categoria..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Data</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold">Forma de Pagamento</TableHead>
                <TableHead className="text-right font-semibold">Valor</TableHead>
                <TableHead className="text-right font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredDespesas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Nenhuma despesa encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredDespesas.map((despesa) => (
                  <TableRow key={despesa.id} className="hover:bg-gray-50">
                    <TableCell>{formatarData(despesa.data)}</TableCell>
                    <TableCell>{despesa.descricao}</TableCell>
                    <TableCell>{despesa.categoria}</TableCell>
                    <TableCell>{despesa.forma_pagamento}</TableCell>
                    <TableCell className="text-right">{formatarValor(despesa.valor)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(despesa)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDelete(despesa.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewDespesaForm
        isOpen={isNewDespesaOpen}
        onClose={() => setIsNewDespesaOpen(false)}
        onSuccess={() => {
          setIsNewDespesaOpen(false)
          fetchDespesas()
        }}
      />

      {selectedDespesa && (
        <EditDespesaForm
          isOpen={isEditDespesaOpen}
          onClose={() => {
            setIsEditDespesaOpen(false)
            setSelectedDespesa(null)
          }}
          onSuccess={() => {
            setIsEditDespesaOpen(false)
            setSelectedDespesa(null)
            fetchDespesas()
          }}
          despesa={selectedDespesa}
        />
      )}
    </div>
  )
} 