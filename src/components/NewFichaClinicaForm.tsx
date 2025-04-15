import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Textarea } from './ui/textarea'

interface Patient {
  id: string
  nome: string
}

interface NewFichaClinicaFormProps {
  isOpen: boolean
  onClose: () => void
}

export function NewFichaClinicaForm({ isOpen, onClose }: NewFichaClinicaFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [showScrollButton, setShowScrollButton] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    patient_id: '',
    data_consulta: '',
    queixa_principal: '',
    diagnostico: '',
    conduta: '',
    observacoes: ''
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    const checkScroll = () => {
      if (formRef.current) {
        const { scrollHeight, clientHeight } = formRef.current
        setShowScrollButton(scrollHeight > clientHeight)
      }
    }

    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [isOpen])

  const scrollUp = () => {
    if (formRef.current) {
      formRef.current.scrollBy({ top: -100, behavior: 'smooth' })
    }
  }

  const scrollDown = () => {
    if (formRef.current) {
      formRef.current.scrollBy({ top: 100, behavior: 'smooth' })
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
      setError('Erro ao carregar lista de pacientes')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePatientChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      patient_id: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw new Error('Erro de autenticação: ' + userError.message)
      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase
        .from('fichas_clinicas')
        .insert([
          {
            patient_id: formData.patient_id,
            user_id: user.id,
            data_consulta: formData.data_consulta,
            queixa_principal: formData.queixa_principal,
            diagnostico: formData.diagnostico,
            conduta: formData.conduta,
            observacoes: formData.observacoes
          }
        ])

      if (error) throw error

      onClose()
    } catch (error) {
      console.error('Erro ao criar ficha clínica:', error)
      setError(error instanceof Error ? error.message : 'Erro ao criar ficha clínica')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Nova Ficha Clínica</h2>
        <div 
          ref={formRef}
          className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Paciente</Label>
                <Select
                  value={formData.patient_id}
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

              <div className="space-y-2">
                <Label htmlFor="data_consulta">Data da Consulta</Label>
                <Input
                  id="data_consulta"
                  name="data_consulta"
                  type="date"
                  value={formData.data_consulta}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="queixa_principal">Queixa Principal</Label>
                <Textarea
                  id="queixa_principal"
                  name="queixa_principal"
                  value={formData.queixa_principal}
                  onChange={handleChange}
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnostico">Diagnóstico</Label>
                <Textarea
                  id="diagnostico"
                  name="diagnostico"
                  value={formData.diagnostico}
                  onChange={handleChange}
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conduta">Conduta</Label>
                <Textarea
                  id="conduta"
                  name="conduta"
                  value={formData.conduta}
                  onChange={handleChange}
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>

        {showScrollButton && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={scrollUp}
              className="h-8 w-8 rounded-full bg-white shadow-md"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={scrollDown}
              className="h-8 w-8 rounded-full bg-white shadow-md"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 mt-4">{error}</p>
        )}
      </div>
    </div>
  )
} 