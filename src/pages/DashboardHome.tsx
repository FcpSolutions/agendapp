import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { RefreshCw, Calendar, Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Consulta {
  id: string
  date: string
  duration: number
  patient: {
    nome: string
  }
}

export default function DashboardHome() {
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [consultasHoje, setConsultasHoje] = useState(0)
  const [consultasDoDia, setConsultasDoDia] = useState<Consulta[]>([])
  const [receitasMes, setReceitasMes] = useState(0)
  const [despesasMes, setDespesasMes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchAllData = async () => {
    console.log('Iniciando atualização manual dos dados...')
    setRefreshing(true)
    try {
      await Promise.all([
        fetchTotalPacientes(),
        fetchConsultasHoje(),
        fetchReceitasMes(),
        fetchDespesasMes()
      ])
      setLastUpdate(new Date())
      console.log('Atualização manual concluída com sucesso')
    } catch (error) {
      console.error('Erro durante a atualização manual:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()

    // Atualizar dados a cada 5 minutos
    const interval = setInterval(fetchAllData, 5 * 60 * 1000) // 5 minutos em milissegundos

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval)
  }, [])

  async function fetchTotalPacientes() {
    try {
      console.log('Iniciando busca de pacientes...')
      
      const { count, error, data } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
      
      console.log('Resultado da busca de pacientes:', { count, error, data })

      if (error) {
        console.error('Erro ao buscar total de pacientes:', error)
        return
      }

      setTotalPacientes(count || 0)
      console.log('Total de pacientes atualizado:', count)
    } catch (err) {
      console.error('Erro ao buscar total de pacientes:', err)
    }
  }

  async function fetchConsultasHoje() {
    try {
      // Obter a data atual e formatá-la corretamente
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const mes = String(hoje.getMonth() + 1).padStart(2, '0')
      const dia = String(hoje.getDate()).padStart(2, '0')
      const dataFormatada = `${ano}-${mes}-${dia}`

      const dataInicio = `${dataFormatada}T00:00:00`
      const dataFim = `${dataFormatada}T23:59:59`
      
      console.log('Iniciando busca de consultas do dia...')
      console.log('Data atual:', hoje)
      console.log('Data formatada para busca:', dataFormatada)
      console.log('Filtros de data:', { dataInicio, dataFim })

      // Verificar todas as consultas existentes para fins de diagnóstico
      const { data: todasConsultas } = await supabase
        .from('appointments')
        .select('id, date, status')
      
      console.log('Total de consultas encontradas:', todasConsultas?.length)
      console.log('Todas as consultas:', todasConsultas)

      // Buscar as consultas apenas da data atual usando between
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          duration,
          status,
          value,
          patients (
            id,
            nome
          )
        `)
        .gte('date', dataInicio)
        .lte('date', dataFim)
        .order('date', { ascending: true })
      
      console.log('Resultado da busca de consultas com filtro between:', { 
        data, 
        error,
        dataInicio,
        dataFim,
        consultasEncontradas: data?.length
      })

      if (error) {
        console.error('Erro ao buscar consultas de hoje:', error)
        return
      }

      // Verificação detalhada dos dados de pacientes retornados
      console.log('Estrutura dos dados de pacientes nas consultas de hoje:', data?.map(item => ({
        id: item.id,
        paciente: item.patients,
        tipo_paciente: typeof item.patients
      })))

      const consultasFormatadas = data.map(consulta => {
        // Verificação detalhada para cada consulta
        console.log('Processando consulta do dia:', consulta.id, 'patients:', consulta.patients)
        
        let pacienteName = 'Paciente não encontrado';
        
        if (consulta.patients) {
          if (Array.isArray(consulta.patients) && consulta.patients.length > 0) {
            pacienteName = consulta.patients[0]?.nome || 'Paciente não encontrado';
          } else if (typeof consulta.patients === 'object' && consulta.patients !== null) {
            // @ts-ignore - Ignora erros de tipo aqui, será tratado em tempo de execução
            pacienteName = consulta.patients.nome || 'Paciente não encontrado';
          }
        }
        
        return {
          id: consulta.id,
          date: consulta.date,
          duration: consulta.duration,
          status: consulta.status,
          value: consulta.value,
          patient: {
            nome: pacienteName
          }
        }
      })

      setConsultasHoje(consultasFormatadas.length)
      setConsultasDoDia(consultasFormatadas)
      console.log('Consultas formatadas para hoje:', consultasFormatadas)
    } catch (err) {
      console.error('Erro ao buscar consultas de hoje:', err)
    }
  }

  async function fetchReceitasMes() {
    try {
      const hoje = new Date()
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      
      const dataInicio = primeiroDiaMes.toISOString().slice(0, 10)
      const dataFim = ultimoDiaMes.toISOString().slice(0, 10)
      
      console.log('Buscando receitas do mês:', { dataInicio, dataFim })

      const { data, error } = await supabase
        .from('appointments')
        .select('value')
        .filter('date', 'gte', `${dataInicio}T00:00:00`)
        .filter('date', 'lte', `${dataFim}T23:59:59`)

      console.log('Resultado da busca de receitas:', { data, error })

      if (error) {
        console.error('Erro ao buscar receitas do mês:', error)
        return
      }

      // Somando os valores das consultas
      const totalReceitas = data?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0
      setReceitasMes(totalReceitas)
      console.log('Total de receitas do mês:', totalReceitas)
    } catch (err) {
      console.error('Erro ao buscar receitas do mês:', err)
    }
  }

  async function fetchDespesasMes() {
    try {
      const hoje = new Date()
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      
      const dataInicio = primeiroDiaMes.toISOString().slice(0, 10)
      const dataFim = ultimoDiaMes.toISOString().slice(0, 10)
      
      console.log('Buscando despesas do mês:', { dataInicio, dataFim })

      const { data, error } = await supabase
        .from('despesas')
        .select('valor')
        .filter('data', 'gte', dataInicio)
        .filter('data', 'lte', dataFim)

      if (error) {
        console.error('Erro ao buscar despesas do mês:', error)
        return
      }

      const totalDespesas = data?.reduce((acc, curr) => acc + curr.valor, 0) || 0
      setDespesasMes(totalDespesas)
      console.log('Total de despesas do mês:', totalDespesas)
    } catch (err) {
      console.error('Erro ao buscar despesas do mês:', err)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  // Função para extrair o horário diretamente da string da data
  const formatTime = (dateString: string) => {
    // Extrair a parte de hora diretamente da string sem conversões
    try {
      // Extrair a parte de hora diretamente
      const timePart = dateString.split('T')[1]?.substring(0, 5);
      console.log('Dashboard: Hora extraída diretamente:', timePart);
      return timePart || '00:00';
    } catch (error) {
      console.error('Dashboard: Erro ao extrair hora da data:', error);
      return '00:00';
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Última atualização: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={fetchAllData} 
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">Total de Pacientes</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {loading ? '...' : totalPacientes}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">Consultas Hoje</h2>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {loading ? '...' : consultasHoje}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">Receitas do Mês</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {loading ? '...' : formatarMoeda(receitasMes)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700">Despesas do Mês</h2>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {loading ? '...' : formatarMoeda(despesasMes)}
          </p>
        </div>
      </div>

      {/* Quadro de Consultas do Dia */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Consultas Agendadas para Hoje</h2>
        {loading ? (
          <p className="text-gray-500 text-center py-4">Carregando consultas...</p>
        ) : consultasDoDia.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhuma consulta agendada para hoje</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {consultasDoDia.map((consulta) => (
              <div 
                key={consulta.id} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">
                        {format(new Date(consulta.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="text-gray-600 font-medium">
                        {formatTime(consulta.date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-800 font-medium">
                      {consulta.patient.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">
                      {consulta.duration} minutos
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 