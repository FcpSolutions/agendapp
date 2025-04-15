import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Edit, Trash2, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { NewEvolucaoForm } from "@/components/NewEvolucaoForm"
import { EditEvolucaoForm } from "@/components/EditEvolucaoForm"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Patient {
  id: string
  nome: string
}

interface Evolucao {
  id: string
  patient_id: string
  data: string
  descricao: string
  created_at: string
  patient: Patient
}

interface DadosProfissional {
  nome_completo: string
  crm: string
}

export default function Evolucao() {
  const [isNewEvolucaoOpen, setIsNewEvolucaoOpen] = useState(false)
  const [isEditEvolucaoOpen, setIsEditEvolucaoOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedEvolucao, setSelectedEvolucao] = useState<Evolucao | null>(null)
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredEvolucoes, setFilteredEvolucoes] = useState<Evolucao[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [reportData, setReportData] = useState({
    patientId: '',
    startDate: '',
    endDate: ''
  })
  const [reportEvolucoes, setReportEvolucoes] = useState<Evolucao[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [dadosProfissional, setDadosProfissional] = useState<DadosProfissional>({
    nome_completo: '',
    crm: ''
  })

  const fetchDadosProfissional = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { data, error } = await supabase
        .from('profiles')
        .select('nome_completo, crm')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Erro ao buscar dados do profissional:', error)
        return
      }
      
      if (data) {
        setDadosProfissional({
          nome_completo: data.nome_completo || '',
          crm: data.crm || ''
        })
      }
    } catch (err) {
      console.error('Erro ao buscar dados do profissional:', err)
    }
  }

  useEffect(() => {
    fetchEvolucoes()
    fetchPatients()
    fetchDadosProfissional()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredEvolucoes(evolucoes)
    } else {
      const filtered = evolucoes.filter(evolucao => 
        evolucao.patient.nome.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredEvolucoes(filtered)
    }
  }, [searchTerm, evolucoes])

  const fetchEvolucoes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: evolucoesData, error: evolucoesError } = await supabase
        .from('evolucoes')
        .select(`
          id,
          patient_id,
          data,
          descricao,
          created_at,
          patients (
            id,
            nome
          )
        `)
        .order('data', { ascending: false })
      
      console.log('Estrutura dos dados de evoluções:', evolucoesData?.map(item => ({
        id: item.id,
        paciente: item.patients,
        tipo_paciente: typeof item.patients
      })))
      
      if (evolucoesError) throw evolucoesError
      
      const formattedData = evolucoesData.map(evolucao => {
        console.log('Processando evolução:', evolucao.id, 'patients:', evolucao.patients);
        
        let pacienteName = 'Paciente não encontrado';
        let pacienteId = '';
        
        if (evolucao.patients) {
          if (Array.isArray(evolucao.patients) && evolucao.patients.length > 0) {
            pacienteName = evolucao.patients[0]?.nome || 'Paciente não encontrado';
            pacienteId = evolucao.patients[0]?.id || '';
          } else if (typeof evolucao.patients === 'object' && evolucao.patients !== null) {
            // @ts-ignore - Ignora erros de tipo aqui, será tratado em tempo de execução
            pacienteName = evolucao.patients.nome || 'Paciente não encontrado';
            // @ts-ignore
            pacienteId = evolucao.patients.id || '';
          }
        }
        
        return {
          id: evolucao.id,
          patient_id: evolucao.patient_id,
          data: evolucao.data,
          descricao: evolucao.descricao,
          created_at: evolucao.created_at,
          patient: {
            id: pacienteId || evolucao.patient_id || '',
            nome: pacienteName
          }
        }
      })
      
      console.log('Dados de evoluções formatados:', formattedData)
      
      setEvolucoes(formattedData)
    } catch (err) {
      console.error('Erro ao buscar evoluções:', err)
      setError('Erro ao carregar evoluções')
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, nome')
        .order('nome')

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    }
  }

  const handleDeleteEvolucao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta evolução?')) return
    
    try {
      const { error } = await supabase
        .from('evolucoes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setEvolucoes(evolucoes.filter(evolucao => evolucao.id !== id))
    } catch (err) {
      console.error('Erro ao excluir evolução:', err)
      alert('Erro ao excluir evolução')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  const handleGenerateReport = async () => {
    try {
      setLoadingReport(true)
      
      if (!reportData.patientId || !reportData.startDate || !reportData.endDate) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        setLoadingReport(false);
        return;
      }
      
      // Certifique-se de ter os dados do profissional atualizados
      await fetchDadosProfissional()
      
      const { data, error } = await supabase
        .from('evolucoes')
        .select(`
          id,
          patient_id,
          data,
          descricao,
          created_at,
          patients (
            id,
            nome
          )
        `)
        .eq('patient_id', reportData.patientId)
        .gte('data', reportData.startDate)
        .lte('data', reportData.endDate)
        .order('data', { ascending: true })
      
      if (error) throw error
      
      // Formatar os dados da evolução
      const formattedData = data.map(evolucao => {
        let pacienteName = 'Paciente não encontrado';
        let pacienteId = '';
        
        if (evolucao.patients) {
          if (Array.isArray(evolucao.patients) && evolucao.patients.length > 0) {
            pacienteName = evolucao.patients[0]?.nome || 'Paciente não encontrado';
            pacienteId = evolucao.patients[0]?.id || '';
          } else if (typeof evolucao.patients === 'object' && evolucao.patients !== null) {
            // @ts-ignore
            pacienteName = evolucao.patients.nome || 'Paciente não encontrado';
            // @ts-ignore
            pacienteId = evolucao.patients.id || '';
          }
        }
        
        return {
          id: evolucao.id,
          patient_id: evolucao.patient_id,
          data: evolucao.data,
          descricao: evolucao.descricao,
          created_at: evolucao.created_at,
          patient: {
            id: pacienteId || evolucao.patient_id || '',
            nome: pacienteName
          }
        }
      })
      
      setReportEvolucoes(formattedData)
      setShowReport(true)
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      alert('Erro ao gerar relatório. Tente novamente.')
    } finally {
      setLoadingReport(false)
    }
  }

  const closeReport = () => {
    setShowReport(false)
    setIsReportModalOpen(false)
    setReportData({
      patientId: '',
      startDate: '',
      endDate: ''
    })
  }

  const handleReportInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setReportData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePatientChange = (value: string) => {
    setReportData(prev => ({
      ...prev,
      patientId: value
    }))
  }

  const printReport = () => {
    window.print()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Evoluções</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center"
          >
            <FileText className="mr-2 h-4 w-4" /> Gerar Relatório
          </Button>
          <Button onClick={() => setIsNewEvolucaoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Evolução
          </Button>
        </div>
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
          <p className="text-gray-500 text-center">Carregando evoluções...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg shadow p-6">
          <p className="text-red-500 text-center">{error}</p>
        </div>
      ) : filteredEvolucoes.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <p className="text-gray-500 text-center">
              {searchTerm ? "Nenhuma evolução encontrada para este paciente" : "Nenhuma evolução encontrada"}
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
                    Descrição
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvolucoes.map((evolucao) => (
                  <tr key={evolucao.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {evolucao.patient?.nome || 'Paciente não encontrado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(evolucao.data)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {evolucao.descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedEvolucao(evolucao)
                          setIsEditEvolucaoOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar evolução"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvolucao(evolucao.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir evolução"
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

      {isReportModalOpen && !showReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Gerar Relatório de Evoluções</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="patientId">Paciente</Label>
                <Select
                  value={reportData.patientId}
                  onValueChange={handlePatientChange}
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
              
              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input 
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={reportData.startDate}
                  onChange={handleReportInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">Data Final</Label>
                <Input 
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={reportData.endDate}
                  onChange={handleReportInputChange}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReportModalOpen(false)}
                  disabled={loadingReport}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={loadingReport}
                >
                  {loadingReport ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto p-8">
          <div className="max-w-4xl mx-auto print:w-full">
            <div className="flex justify-between items-center mb-8 print:hidden">
              <h1 className="text-2xl font-bold">Relatório de Evoluções</h1>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={printReport}>
                  Imprimir
                </Button>
                <Button variant="outline" onClick={closeReport}>
                  Fechar
                </Button>
              </div>
            </div>
            
            <div className="print:block">
              <h1 className="text-3xl font-bold text-center mb-6">Relatório de Evoluções</h1>
              
              {reportEvolucoes.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-col md:flex-row md:gap-6 md:justify-between">
                    <div className="md:w-1/2">
                      <h2 className="text-xl font-semibold mb-2">Dados do Paciente</h2>
                      <p className="text-lg">Nome: {reportEvolucoes[0].patient.nome}</p>
                      <p className="text-lg">Período: {format(new Date(reportData.startDate), "dd/MM/yyyy", { locale: ptBR })} a {format(new Date(reportData.endDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    
                    <div className="md:w-1/2 mt-4 md:mt-0">
                      <h2 className="text-xl font-semibold mb-2">Informações do Profissional</h2>
                      <p className="text-lg">Nome Completo: {dadosProfissional.nome_completo || 'Não informado'}</p>
                      <p className="text-lg">Número do Conselho Regional: {dadosProfissional.crm || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {reportEvolucoes.length === 0 ? (
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-lg">Nenhuma evolução encontrada para este paciente no período selecionado.</p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Evoluções</h2>
                  <div className="space-y-6">
                    {reportEvolucoes.map((evolucao) => (
                      <div key={evolucao.id} className="border border-gray-300 rounded-lg p-4">
                        <div className="flex justify-between border-b pb-2 mb-2">
                          <h3 className="font-semibold">Data: {formatDate(evolucao.data)}</h3>
                        </div>
                        <div className="whitespace-pre-wrap">
                          {evolucao.descricao}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-10 text-center text-gray-500 print:mt-20">
                <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <NewEvolucaoForm 
        isOpen={isNewEvolucaoOpen} 
        onClose={() => {
          setIsNewEvolucaoOpen(false)
          fetchEvolucoes()
        }} 
      />

      {selectedEvolucao && (
        <EditEvolucaoForm 
          evolucao={selectedEvolucao} 
          isOpen={isEditEvolucaoOpen} 
          onClose={() => {
            setIsEditEvolucaoOpen(false)
            setSelectedEvolucao(null)
          }} 
          onSuccess={fetchEvolucoes} 
        />
      )}
    </div>
  )
} 