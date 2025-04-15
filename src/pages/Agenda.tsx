import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Clock, User, Trash2, Edit } from "lucide-react"
import { NewAppointmentForm } from "@/components/NewAppointmentForm"
import { EditAppointmentForm } from "@/components/EditAppointmentForm"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Input } from "@/components/ui/input"

interface Appointment {
  id: string
  date: string
  duration: number
  patient_id: string
  status: string
  notes: string
  value: number
  patient_type?: string
  convenio_nome?: string
  convenio_operadora?: string
  patient: {
    id: string
    nome: string
  }
}

export default function Agenda() {
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [operadoraFilter, setOperadoraFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [useDateRange, setUseDateRange] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    fetchAppointments()
  }, [selectedDate, useDateRange, dataInicial, dataFinal])

  useEffect(() => {
    // Filtrar consultas quando o termo de busca mudar
    const filtered = appointments.filter(appointment => {
      const matchesPaciente = appointment.patient.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOperadora = !operadoraFilter || 
        (appointment.convenio_operadora && 
         appointment.convenio_operadora.toLowerCase().includes(operadoraFilter.toLowerCase()));
      const matchesTipo = !tipoFilter || appointment.patient_type === tipoFilter;
      
      return matchesPaciente && matchesOperadora && matchesTipo;
    });
    
    setFilteredAppointments(filtered);
  }, [searchTerm, operadoraFilter, tipoFilter, appointments]);

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let dataInicio, dataFim;
      
      if (useDateRange && dataInicial && dataFinal) {
        // Se estiver usando o filtro de intervalo de datas, use essas datas
        dataInicio = dataInicial;
        dataFim = dataFinal;
      } else {
        // Calculando primeiro e último dia do mês selecionado
        const [ano, mes] = selectedDate.split('-')
        const primeiroDiaMes = new Date(Number(ano), Number(mes) - 1, 1)
        const ultimoDiaMes = new Date(Number(ano), Number(mes), 0)
        
        dataInicio = primeiroDiaMes.toISOString().slice(0, 10)
        dataFim = ultimoDiaMes.toISOString().slice(0, 10)
      }
      
      console.log('Buscando consultas do período:', { dataInicio, dataFim })
      
      // Primeiro, vamos verificar todas as consultas para debug
      const { data: todasConsultas } = await supabase
        .from('appointments')
        .select('*')
      
      console.log('Todas as consultas:', todasConsultas)
      console.log('Datas disponíveis:', todasConsultas?.map(c => c.date))
      console.log('Valores disponíveis:', todasConsultas?.map(c => c.value))
      
      // Agora fazemos a busca com o filtro de data do mês
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          duration,
          status,
          notes,
          patient_id,
          value,
          patient_type,
          convenio_nome,
          convenio_operadora,
          patients (
            id,
            nome
          )
        `)
        .filter('date', 'gte', `${dataInicio}T00:00:00`)
        .filter('date', 'lte', `${dataFim}T23:59:59`)
        .order('date', { ascending: true })
      
      console.log('Resultado da busca com filtro:', {
        data: appointmentsData,
        error: appointmentsError,
        dataInicio,
        dataFim
      })
      
      // Verificação dos dados de pacientes retornados
      console.log('Estrutura dos dados retornados:', appointmentsData?.map(item => ({
        id: item.id,
        paciente: item.patients,
        tipo_paciente: typeof item.patients
      })))
      
      if (appointmentsError) throw appointmentsError
      
      const formattedData = appointmentsData.map(appointment => {
        // Verificação detalhada para cada consulta
        console.log('Processando consulta:', appointment.id, 'patients:', appointment.patients)
        
        let pacienteName = 'Paciente não encontrado';
        let pacienteId = '';
        
        if (appointment.patients) {
          if (Array.isArray(appointment.patients) && appointment.patients.length > 0) {
            pacienteName = appointment.patients[0]?.nome || 'Paciente não encontrado';
            pacienteId = appointment.patients[0]?.id || '';
          } else if (typeof appointment.patients === 'object' && appointment.patients !== null) {
            // @ts-ignore - Ignora erros de tipo aqui, será tratado em tempo de execução
            pacienteName = appointment.patients.nome || 'Paciente não encontrado';
            // @ts-ignore
            pacienteId = appointment.patients.id || '';
          }
        }
        
        return {
          id: appointment.id,
          date: appointment.date,
          duration: appointment.duration,
          status: appointment.status,
          notes: appointment.notes,
          patient_id: appointment.patient_id,
          value: appointment.value || 0,
          patient_type: appointment.patient_type || 'particular',
          convenio_nome: appointment.convenio_nome || '',
          convenio_operadora: appointment.convenio_operadora || '',
          patient: {
            id: pacienteId || appointment.patient_id || '',
            nome: pacienteName
          }
        };
      })
      
      console.log('Dados formatados:', formattedData)
      
      setAppointments(formattedData)
    } catch (err) {
      console.error('Erro ao buscar consultas:', err)
      setError('Erro ao carregar consultas')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta consulta?')) return
    
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setAppointments(appointments.filter(appointment => appointment.id !== id))
    } catch (err) {
      console.error('Erro ao excluir consulta:', err)
      alert('Erro ao excluir consulta')
    }
  }

  const handleEditAppointment = (appointment: Appointment) => {
    // Incluir log para depuração
    console.log('Enviando appointment para edição:', {
      id: appointment.id,
      date: appointment.date,
      formattedTime: formatTime(appointment.date)
    });
    setSelectedAppointment(appointment);
    setIsEditAppointmentOpen(true);
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "dd/MM", { locale: ptBR })
  }

  const formatTime = (dateString: string) => {
    // Extrair o horário diretamente da string, sem conversão de fuso horário
    console.log('String de data original:', dateString);
    
    try {
      // Extrair a parte de hora diretamente da string
      const timePart = dateString.split('T')[1]?.substring(0, 5);
      console.log('Hora extraída diretamente:', timePart);
      return timePart || '00:00';
    } catch (error) {
      console.error('Erro ao extrair hora da data:', error);
      return '00:00';
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'cancelled':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Agendada'
      case 'completed':
        return 'Concluída'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  console.log('Consultas a serem exibidas:', appointments);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
          <Button onClick={() => setIsNewAppointmentOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Consulta
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <Input
              type="search"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex-1 min-w-[250px]">
            <Input
              type="search"
              placeholder="Filtrar por operadora..."
              value={operadoraFilter}
              onChange={(e) => setOperadoraFilter(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex-0 min-w-[180px]">
            <select
              aria-label="Filtrar por tipo"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            >
              <option value="">Todos os tipos</option>
              <option value="particular">Particular</option>
              <option value="convenio">Convênio</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="useDateRange" 
              checked={useDateRange}
              onChange={(e) => setUseDateRange(e.target.checked)}
              className="rounded border-gray-300 h-4 w-4"
            />
            <label htmlFor="useDateRange" className="text-sm font-medium text-gray-700">
              Filtrar por período personalizado
            </label>
          </div>
          
          {useDateRange ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <label htmlFor="dataInicial" className="text-sm font-medium text-gray-700">De:</label>
                <Input
                  type="date"
                  id="dataInicial"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-1">
                <label htmlFor="dataFinal" className="text-sm font-medium text-gray-700">Até:</label>
                <Input
                  type="date"
                  id="dataFinal"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor="month" className="text-sm font-medium text-gray-700">Período mensal:</label>
              <div className="flex gap-2">
                <select
                  id="month"
                  aria-label="Selecione o mês"
                  value={selectedDate.split('-')[1]}
                  onChange={(e) => {
                    const year = selectedDate.split('-')[0];
                    setSelectedDate(`${year}-${e.target.value}`);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="01">Janeiro</option>
                  <option value="02">Fevereiro</option>
                  <option value="03">Março</option>
                  <option value="04">Abril</option>
                  <option value="05">Maio</option>
                  <option value="06">Junho</option>
                  <option value="07">Julho</option>
                  <option value="08">Agosto</option>
                  <option value="09">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
                <select
                  id="year"
                  aria-label="Selecione o ano"
                  value={selectedDate.split('-')[0]}
                  onChange={(e) => {
                    const month = selectedDate.split('-')[1];
                    setSelectedDate(`${e.target.value}-${month}`);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">Carregando consultas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg shadow p-6">
          <p className="text-red-500 text-center">{error}</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <p className="text-gray-500 text-center">
              {searchTerm ? 'Nenhuma consulta encontrada para este paciente' : 'Nenhuma consulta agendada'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-50 rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-blue-600">Total de Consultas</p>
                  <p className="text-2xl font-bold text-blue-700">{filteredAppointments.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-green-600">Consultas Concluídas</p>
                  <p className="text-2xl font-bold text-green-700">
                    {filteredAppointments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-yellow-600">Consultas Agendadas</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {filteredAppointments.filter(a => a.status === 'scheduled').length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-red-600">Consultas Canceladas</p>
                  <p className="text-2xl font-bold text-red-700">
                    {filteredAppointments.filter(a => a.status === 'cancelled').length}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-purple-600">Valor Total</p>
                  <p className="text-2xl font-bold text-purple-700">
                    R$ {filteredAppointments.reduce((acc, curr) => acc + curr.value, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                    Data
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">
                    Horário
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                    Paciente
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                    Tipo/Convênio
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                    Duração
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                    Valor
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {formatShortDate(appointment.date)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-gray-400" />
                        {formatTime(appointment.date)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="truncate max-w-[150px]">
                          {appointment.patient?.nome || 'Paciente não encontrado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      {appointment.patient_type === 'convenio' ? (
                        <div className="text-blue-600 truncate max-w-[150px]">
                          Convênio: {appointment.convenio_nome || 'N/A'} 
                          {appointment.convenio_operadora ? ` (${appointment.convenio_operadora})` : ''}
                        </div>
                      ) : (
                        <div className="text-green-600">Particular</div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      {appointment.duration} min
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      <span className={`${getStatusColor(appointment.status)} font-medium`}>
                        {getStatusText(appointment.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                      R$ {appointment.value.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir consulta"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleEditAppointment(appointment)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar consulta"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewAppointmentForm 
        isOpen={isNewAppointmentOpen} 
        onClose={() => {
          setIsNewAppointmentOpen(false)
          fetchAppointments()
        }} 
      />

      {selectedAppointment && (
        <EditAppointmentForm
          appointment={selectedAppointment}
          isOpen={isEditAppointmentOpen}
          onClose={() => {
            setIsEditAppointmentOpen(false)
            setSelectedAppointment(null)
          }}
          onSuccess={() => {
            fetchAppointments()
          }}
        />
      )}
    </div>
  )
} 