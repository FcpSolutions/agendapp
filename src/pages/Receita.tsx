import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Edit, Trash2, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { NewReceitaForm } from "@/components/NewReceitaForm"
import { EditReceitaForm } from "@/components/EditReceitaForm"

interface Receita {
  id: string
  patient_id: string
  data: string
  tipo_pagamento: string
  operadora: string
  plano_saude: string
  valor: number
  observacoes: string
  created_at: string
  patient: {
    id: string
    nome: string
  }
}

interface ReceitaResponse {
  id: string
  patient_id: string
  data: string
  tipo_pagamento: string
  operadora: string
  plano_saude: string
  valor: number
  observacoes: string
  created_at: string
  patients: {
    id: string
    nome: string
  }[] | null
}

export default function Receita() {
  const [isNewReceitaOpen, setIsNewReceitaOpen] = useState(false)
  const [isEditReceitaOpen, setIsEditReceitaOpen] = useState(false)
  const [selectedReceita, setSelectedReceita] = useState<Receita | null>(null)
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredReceitas, setFilteredReceitas] = useState<Receita[]>([])

  useEffect(() => {
    fetchReceitas()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredReceitas(receitas)
    } else {
      const filtered = receitas.filter(receita => 
        receita.patient.nome.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredReceitas(filtered)
    }
  }, [searchTerm, receitas])

  const fetchReceitas = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select(`
          id,
          patient_id,
          data,
          tipo_pagamento,
          operadora,
          plano_saude,
          valor,
          observacoes,
          created_at,
          patients (
            id,
            nome
          )
        `)
        .order('data', { ascending: false })
      
      if (receitasError) throw receitasError
      
      console.log('Dados recebidos do Supabase:', receitasData)
      
      const formattedData = (receitasData as unknown as ReceitaResponse[]).map(receita => {
        console.log('Receita:', receita)
        console.log('Patients:', receita.patients)
        
        return {
          id: receita.id,
          patient_id: receita.patient_id,
          data: receita.data,
          tipo_pagamento: receita.tipo_pagamento,
          operadora: receita.operadora,
          plano_saude: receita.plano_saude,
          valor: receita.valor,
          observacoes: receita.observacoes,
          created_at: receita.created_at,
          patient: {
            id: receita.patients?.[0]?.id || '',
            nome: receita.patients?.[0]?.nome || 'Paciente não encontrado'
          }
        }
      })
      
      setReceitas(formattedData)
    } catch (err) {
      console.error('Erro ao buscar receitas:', err)
      setError('Erro ao carregar receitas')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReceita = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return
    
    try {
      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setReceitas(receitas.filter(receita => receita.id !== id))
    } catch (err) {
      console.error('Erro ao excluir receita:', err)
      alert('Erro ao excluir receita')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Receitas</h1>
        <Button onClick={() => setIsNewReceitaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Receita
        </Button>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Filtrar por nome do paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">Carregando receitas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg shadow p-6">
          <p className="text-red-500 text-center">{error}</p>
        </div>
      ) : filteredReceitas.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <p className="text-gray-500 text-center">
              {searchTerm ? "Nenhuma receita encontrada para este paciente" : "Nenhuma receita encontrada"}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Convênio
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceitas.map((receita) => (
                  <tr key={receita.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receita.patient?.nome || 'Paciente não encontrado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(receita.data)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receita.tipo_pagamento === 'particular' ? 'Particular' : 'Convênio'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receita.tipo_pagamento === 'convenio' ? (
                        <div>
                          <div>{receita.operadora}</div>
                          <div className="text-sm text-gray-500">{receita.plano_saude}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(receita.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedReceita(receita)
                          setIsEditReceitaOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar receita"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReceita(receita.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir receita"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewReceitaForm 
        isOpen={isNewReceitaOpen} 
        onClose={() => {
          setIsNewReceitaOpen(false)
          fetchReceitas()
        }} 
        onSuccess={fetchReceitas}
      />

      {selectedReceita && (
        <EditReceitaForm 
          receita={selectedReceita} 
          isOpen={isEditReceitaOpen} 
          onClose={() => {
            setIsEditReceitaOpen(false)
            setSelectedReceita(null)
          }} 
          onSuccess={fetchReceitas} 
        />
      )}
    </div>
  )
} 