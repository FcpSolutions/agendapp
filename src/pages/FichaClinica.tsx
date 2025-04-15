import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, FileText, User, Calendar, Edit, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { NewFichaClinicaForm } from "@/components/NewFichaClinicaForm"
import { EditFichaClinicaForm } from "@/components/EditFichaClinicaForm"

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

export default function FichaClinica() {
  const [isNewFichaOpen, setIsNewFichaOpen] = useState(false)
  const [fichas, setFichas] = useState<FichaClinica[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFicha, setSelectedFicha] = useState<FichaClinica | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    fetchFichas()
  }, [])

  const fetchFichas = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: fichasData, error: fichasError } = await supabase
        .from('fichas_clinicas')
        .select(`
          id,
          patient_id,
          data_consulta,
          queixa_principal,
          diagnostico,
          conduta,
          observacoes,
          created_at,
          patients (
            id,
            nome
          )
        `)
        .order('data_consulta', { ascending: false })
      
      console.log('Estrutura dos dados de fichas clínicas:', fichasData?.map(item => ({
        id: item.id,
        paciente: item.patients,
        tipo_paciente: typeof item.patients
      })))
      
      if (fichasError) throw fichasError
      
      const formattedData = fichasData.map(ficha => {
        console.log('Processando ficha clínica:', ficha.id, 'patients:', ficha.patients);
        
        let pacienteName = 'Paciente não encontrado';
        let pacienteId = '';
        
        if (ficha.patients) {
          if (Array.isArray(ficha.patients) && ficha.patients.length > 0) {
            pacienteName = ficha.patients[0]?.nome || 'Paciente não encontrado';
            pacienteId = ficha.patients[0]?.id || '';
          } else if (typeof ficha.patients === 'object' && ficha.patients !== null) {
            // @ts-ignore - Ignora erros de tipo aqui, será tratado em tempo de execução
            pacienteName = ficha.patients.nome || 'Paciente não encontrado';
            // @ts-ignore
            pacienteId = ficha.patients.id || '';
          }
        }
        
        return {
          id: ficha.id,
          patient_id: ficha.patient_id,
          data_consulta: ficha.data_consulta,
          queixa_principal: ficha.queixa_principal,
          diagnostico: ficha.diagnostico,
          conduta: ficha.conduta,
          observacoes: ficha.observacoes,
          created_at: ficha.created_at,
          patient: {
            id: pacienteId || ficha.patient_id || '',
            nome: pacienteName
          }
        }
      })
      
      console.log('Dados de fichas formatados:', formattedData)
      
      setFichas(formattedData)
    } catch (err) {
      console.error('Erro ao buscar fichas clínicas:', err)
      setError('Erro ao carregar fichas clínicas')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFicha = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ficha clínica?')) return
    
    try {
      const { error } = await supabase
        .from('fichas_clinicas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setFichas(fichas.filter(ficha => ficha.id !== id))
    } catch (err) {
      console.error('Erro ao excluir ficha clínica:', err)
      alert('Erro ao excluir ficha clínica')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Fichas Clínicas</h1>
        <Button onClick={() => setIsNewFichaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Ficha Clínica
        </Button>
      </div>
      
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">Carregando fichas clínicas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg shadow p-6">
          <p className="text-red-500 text-center">{error}</p>
        </div>
      ) : fichas.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <p className="text-gray-500 text-center">Nenhuma ficha clínica encontrada</p>
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
                    Data da Consulta
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Queixa Principal
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diagnóstico
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fichas.map((ficha) => (
                  <tr key={ficha.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {ficha.patient?.nome || 'Paciente não encontrado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(ficha.data_consulta)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {ficha.queixa_principal}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {ficha.diagnostico}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedFicha(ficha)
                          setIsViewModalOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Visualizar ficha"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFicha(ficha)
                          setIsEditModalOpen(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Editar ficha"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFicha(ficha.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir ficha"
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

      <NewFichaClinicaForm 
        isOpen={isNewFichaOpen} 
        onClose={() => {
          setIsNewFichaOpen(false)
          fetchFichas()
        }} 
      />

      {isViewModalOpen && selectedFicha && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Visualizar Ficha Clínica</h2>
            <p><strong>Paciente:</strong> {selectedFicha.patient.nome}</p>
            <p><strong>Data da Consulta:</strong> {formatDate(selectedFicha.data_consulta)}</p>
            <p><strong>Queixa Principal:</strong> {selectedFicha.queixa_principal}</p>
            <p><strong>Diagnóstico:</strong> {selectedFicha.diagnostico}</p>
            <p><strong>Conduta:</strong> {selectedFicha.conduta}</p>
            <p><strong>Observações:</strong> {selectedFicha.observacoes}</p>
            <Button onClick={() => setIsViewModalOpen(false)} className="mt-4">Fechar</Button>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedFicha && (
        <EditFichaClinicaForm 
          ficha={selectedFicha} 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          onSuccess={fetchFichas} 
        />
      )}
    </div>
  )
} 