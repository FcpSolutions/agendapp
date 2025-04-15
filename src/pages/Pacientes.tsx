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
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
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
    setEditingPatient(patient)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(patient => (
            <PatientCard 
              key={patient.id} 
              patient={patient}
              onDelete={handleDeletePatient}
              onEdit={handleEditPatient}
            />
          ))}
        </div>
      )}

      <NewPatientForm 
        isOpen={showNewPatientForm} 
        onClose={handleCloseForm}
        editingPatient={editingPatient}
      />
    </div>
  )
} 