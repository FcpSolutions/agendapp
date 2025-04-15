import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PatientCard } from './PatientCard'
import { Button } from './ui/button'
import { Plus } from 'lucide-react'
import { NewPatientForm } from './NewPatientForm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

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

// Interface compatível com o esperado pelo NewPatientForm
interface EditablePatient {
  id: string
  nome: string
  cpf: string
  data_nascimento: string
  email: string
  telefone: string
  endereco: {
    cep: string
    logradouro: string
    bairro: string
    cidade: string
    estado: string
    numero: string
    complemento: string
  }
}

export function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<EditablePatient | null>(null)

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
      setError('Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id)

      if (error) throw error

      setPatients(patients.filter(patient => patient.id !== id))
    } catch (error) {
      console.error('Error deleting patient:', error)
      setError('Erro ao excluir paciente')
    }
  }

  const handleEdit = (patient: Patient) => {
    // Converter o Patient para EditablePatient
    setSelectedPatient({
      id: patient.id,
      nome: patient.nome,
      cpf: patient.cpf || '',
      data_nascimento: patient.data_nascimento || '',
      email: patient.email,
      telefone: patient.telefone,
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
    setIsNewPatientDialogOpen(true)
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Button
          onClick={() => {
            setSelectedPatient(null)
            setIsNewPatientDialogOpen(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPatient ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
          </DialogHeader>
          <NewPatientForm 
            onClose={() => {
              setIsNewPatientDialogOpen(false)
              fetchPatients()
            }} 
            isOpen={isNewPatientDialogOpen}
            editingPatient={selectedPatient}
          />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.length === 0 ? (
          <p className="text-center col-span-full py-8 text-gray-500">
            Nenhum paciente cadastrado
          </p>
        ) : (
          patients.map(patient => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onDelete={() => handleDelete(patient.id)}
              onEdit={() => handleEdit(patient)}
            />
          ))
        )}
      </div>
    </div>
  )
} 