import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Search, Plus, Eye, Pencil, Trash } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NewReceitaForm } from '@/components/NewReceitaForm'
import { EditReceitaForm } from '@/components/EditReceitaForm'

interface Receita {
  id: string
  patient_id: string
  patients: {
    id: string
    nome: string
  }
  data: string
  tipo_pagamento: string
  operadora: string
  plano_saude: string
  valor: number
  observacoes: string
  patient?: {
    id: string
    nome: string
  }
}

export default function Receitas() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConvenio, setSelectedConvenio] = useState<string>('')
  const [filteredReceitas, setFilteredReceitas] = useState<Receita[]>([])
  const [isNewReceitaOpen, setIsNewReceitaOpen] = useState(false)
  const [isEditReceitaOpen, setIsEditReceitaOpen] = useState(false)
  const [selectedReceita, setSelectedReceita] = useState<Receita | null>(null)
  const [convenios, setConvenios] = useState<string[]>([])

  useEffect(() => {
    fetchReceitas()
  }, [])

  useEffect(() => {
    // Extrair lista única de convênios das receitas
    const uniqueConvenios = Array.from(new Set(
      receitas
        .filter(r => r.tipo_pagamento === 'convenio' && r.operadora)
        .map(r => r.operadora)
    )).sort()
    
    console.log('Convênios disponíveis:', uniqueConvenios)
    setConvenios(uniqueConvenios)
  }, [receitas])

  useEffect(() => {
    let filtered = [...receitas]

    // Filtrar por nome do paciente ou operadora
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase()
      filtered = filtered.filter(receita =>
        receita.patient?.nome?.toLowerCase().includes(searchTermLower) ||
        receita.patients?.nome?.toLowerCase().includes(searchTermLower) ||
        (receita.operadora && receita.operadora.toLowerCase().includes(searchTermLower))
      )
      console.log('Após filtro por nome/operadora:', {
        termo: searchTerm,
        resultados: filtered.length
      })
    }

    // Filtrar por convênio
    if (selectedConvenio) {
      filtered = filtered.filter(receita => {
        const isConvenio = receita.tipo_pagamento === 'convenio'
        const operadoraMatch = receita.operadora === selectedConvenio
        return isConvenio && operadoraMatch
      })
    }

    console.log('Resultado final:', {
      totalReceitas: receitas.length,
      receitasFiltradas: filtered.length,
      filtroConvenio: selectedConvenio,
      filtroNome: searchTerm
    })

    setFilteredReceitas(filtered)
  }, [searchTerm, selectedConvenio, receitas])

  const fetchReceitas = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Iniciando busca de receitas com pacientes...')

      // Buscar receitas com JOIN para a tabela de pacientes
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
          patients!inner (
            id, 
            nome
          )
        `)
        .order('data', { ascending: false })

      console.log('Receitas retornadas do banco:', receitasData)

      if (receitasError) {
        console.error('Erro ao buscar receitas:', receitasError)
        setError('Erro ao carregar receitas: ' + receitasError.message)
        return
      }

      // Formatar os dados para o formato esperado pela interface
      const receitasFormatadas = receitasData.map(receita => {
        // Extrair paciente dos dados aninhados
        let pacienteNome = 'Paciente não encontrado';
        let pacienteId = receita.patient_id;
        
        console.log('Processando receita:', receita.id, 'patients:', receita.patients);
        
        // Verificar estrutura do objeto patients
        if (receita.patients) {
          if (Array.isArray(receita.patients) && receita.patients.length > 0) {
            pacienteNome = receita.patients[0]?.nome || pacienteNome;
            pacienteId = receita.patients[0]?.id || pacienteId;
            console.log('Paciente (array):', pacienteNome);
          } else {
            // @ts-ignore - Ignora erros de tipo aqui
            pacienteNome = receita.patients.nome || pacienteNome;
            // @ts-ignore
            pacienteId = receita.patients.id || pacienteId;
            console.log('Paciente (objeto):', pacienteNome);
          }
        }
        
        // Criar objeto com patient e garantir que patients atenda à interface
        return {
          ...receita,
          patient: {
            id: pacienteId,
            nome: pacienteNome
          },
          // Garantir que patients atenda à interface Receita
          patients: {
            id: pacienteId,
            nome: pacienteNome
          }
        };
      }) as Receita[];

      console.log('Receitas formatadas:', receitasFormatadas)
      
      setReceitas(receitasFormatadas)
      setFilteredReceitas(receitasFormatadas)
    } catch (err) {
      console.error('Erro ao buscar receitas:', err)
      setError('Erro ao carregar receitas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return

    try {
      setLoading(true)
      setError('')

      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchReceitas()
    } catch (err) {
      console.error('Erro ao excluir receita:', err)
      setError('Erro ao excluir receita')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleEdit = (receita: Receita) => {
    setSelectedReceita(receita)
    setIsEditReceitaOpen(true)
  }

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-500">{error}</div>

  // Debug dos dados das receitas
  console.log('Receitas a serem exibidas no grid:', filteredReceitas.map(r => ({
    id: r.id, 
    patient_id: r.patient_id,
    patient: r.patients,
    nome: r.patients?.nome
  })));

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Receitas</h1>
        <Button onClick={() => setIsNewReceitaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Receita
        </Button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label htmlFor="convenio" className="text-sm text-gray-600">
            Filtrar por convênio
          </label>
          <select
            id="convenio"
            value={selectedConvenio}
            onChange={(e) => setSelectedConvenio(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 min-w-[200px]"
          >
            <option value="">Todos os convênios</option>
            {convenios.map(convenio => (
              <option key={convenio} value={convenio}>
                {convenio}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paciente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReceitas.map((receita) => {
              // Debugar cada receita individualmente
              console.log('Renderizando receita:', receita.id, {
                patients: receita.patients,
                nome: receita.patients?.nome,
                tipo: typeof receita.patients
              });
              
              return (
                <tr key={receita.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Tentar ambas as fontes de nome do paciente */}
                    {receita.patient?.nome || receita.patients?.nome || 'Nome não disponível'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(receita.data)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {receita.tipo_pagamento === 'particular' ? 'Particular' : 'Convênio'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatCurrency(receita.valor)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(receita)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(receita.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NewReceitaForm
        isOpen={isNewReceitaOpen}
        onClose={() => {
          setIsNewReceitaOpen(false)
          fetchReceitas()
        }}
        onSuccess={() => {
          setIsNewReceitaOpen(false)
          fetchReceitas()
        }}
      />

      {selectedReceita && (
        <EditReceitaForm
          isOpen={isEditReceitaOpen}
          onClose={() => {
            setIsEditReceitaOpen(false)
            setSelectedReceita(null)
            fetchReceitas()
          }}
          onSuccess={() => {
            setIsEditReceitaOpen(false)
            setSelectedReceita(null)
            fetchReceitas()
          }}
          receita={selectedReceita}
        />
      )}
    </div>
  )
} 