import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NewPatientForm } from "@/components/NewPatientForm"
import { supabase } from '@/lib/supabase'
import { PatientCard } from '@/components/PatientCard'

interface Patient {
  id: string
  nome: string
  email: string
  telefone: string
  created_at: string
  ativo?: boolean
  tipo_paciente?: string
  convenio_nome?: string
  convenio_operadora?: string
  cpf?: string
  data_nascimento?: string
  endereco?: {
    cep: string
    logradouro: string
    bairro: string
    cidade: string
    estado: string
    numero: string
    complemento: string
  }
}

export default function Pacientes() {
  const [showNewPatientForm, setShowNewPatientForm] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPatient, setEditingPatient] = useState<{
    id: string
    nome: string
    cpf: string
    data_nascimento: string
    email: string
    telefone: string
    tipo_paciente?: string
    convenio_nome?: string
    convenio_operadora?: string
    endereco: {
      cep: string
      logradouro: string
      bairro: string
      cidade: string
      estado: string
      numero: string
      complemento: string
    }
  } | null>(null)

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: agendamentos } = await supabase
        .from('appointments')
        .select('patient_id, patient_type, convenio_nome, convenio_operadora, date')
        .order('date', { ascending: false })

      const ultimoTipo = new Map<string, { patient_type?: string; convenio_nome?: string; convenio_operadora?: string }>()
      for (const agendamento of agendamentos || []) {
        if (!agendamento.patient_id || ultimoTipo.has(agendamento.patient_id)) continue
        if (agendamento.patient_type !== 'particular' && agendamento.patient_type !== 'convenio') continue
        ultimoTipo.set(agendamento.patient_id, agendamento)
      }

      setPatients((data || []).map((patient) => {
        if (patient.tipo_paciente === 'particular' || patient.tipo_paciente === 'convenio') {
          return patient
        }
        const agenda = ultimoTipo.get(patient.id)
        if (!agenda) return { ...patient, tipo_paciente: 'particular' }
        return {
          ...patient,
          tipo_paciente: agenda.patient_type,
          convenio_nome: patient.convenio_nome || agenda.convenio_nome || '',
          convenio_operadora: patient.convenio_operadora || agenda.convenio_operadora || '',
        }
      }))
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAtivo = async (patient: Patient) => {
    const novoAtivo = patient.ativo === false
    const mensagem = novoAtivo
      ? `Reativar ${patient.nome}? O paciente volta a aparecer nas listas para novos registros. O histórico já estava preservado.`
      : `Inativar ${patient.nome}? O histórico permanece na agenda, na ficha clínica, na evolução e no financeiro. O paciente deixa de aparecer apenas nas listas para novos registros.`

    if (!confirm(mensagem)) return

    try {
      const { error } = await supabase
        .from('patients')
        .update({ ativo: novoAtivo })
        .eq('id', patient.id)

      if (error) throw error
      setPatients(patients.map((item) => (
        item.id === patient.id ? { ...item, ativo: novoAtivo } : item
      )))
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDeletePatient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id)

      if (error) throw error
      setPatients(patients.filter(patient => patient.id !== id))
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient({
      id: patient.id,
      nome: patient.nome,
      cpf: patient.cpf || '',
      data_nascimento: patient.data_nascimento || '',
      email: patient.email,
      telefone: patient.telefone,
      tipo_paciente: patient.tipo_paciente || 'particular',
      convenio_nome: patient.convenio_nome || '',
      convenio_operadora: patient.convenio_operadora || '',
      endereco: patient.endereco || {
        cep: '',
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        numero: '',
        complemento: ''
      }
    })
    setShowNewPatientForm(true)
  }

  const handleCloseForm = () => {
    setShowNewPatientForm(false)
    setEditingPatient(null)
    fetchPatients() // Recarrega a lista após adicionar ou editar um paciente
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
        <Button onClick={() => setShowNewPatientForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Paciente
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">Carregando pacientes...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">Nenhum paciente cadastrado</p>
        </div>
      ) : (
        <>
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#0f9f8f]" />
            Particular
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#5b4bd6]" />
            Convênio
          </span>
        </div>
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {patients.map(patient => (
            <PatientCard 
              key={patient.id} 
              patient={patient}
              onDelete={handleDeletePatient}
              onEdit={handleEditPatient}
              onToggleAtivo={handleToggleAtivo}
            />
          ))}
        </div>
        </>
      )}

      <NewPatientForm 
        isOpen={showNewPatientForm} 
        onClose={handleCloseForm}
        editingPatient={editingPatient}
      />
    </div>
  )
} 