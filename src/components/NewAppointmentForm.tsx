import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Patient {
  id: string
  nome: string
}

interface NewAppointmentFormProps {
  onClose: () => void
  isOpen: boolean
}

export function NewAppointmentForm({ onClose, isOpen }: NewAppointmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [formData, setFormData] = useState({
    patient_id: '',
    date: '',
    time: '',
    duration: '30', // duração padrão de 30 minutos
    notes: '',
    value: '0.00', // valor padrão da consulta
    patient_type: 'particular', // particular ou convenio
    convenio_nome: '', // nome do convênio
    convenio_operadora: '', // operadora do convênio
    is_recurring: false,
    recurrence_frequency: 'weekly', // weekly, biweekly, monthly
    recurrence_count: '4' // número de repetições
  })
  const [showScrollButton, setShowScrollButton] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Verificar se o usuário está autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw new Error('Erro de autenticação: ' + userError.message)
      if (!user) throw new Error('Usuário não autenticado')
      
      // Criar array de datas para consultas recorrentes
      const appointments = []
      const baseDate = new Date(`${formData.date}T${formData.time}`)
      
      if (formData.is_recurring) {
        const count = parseInt(formData.recurrence_count)
        for (let i = 0; i < count; i++) {
          const appointmentDate = new Date(baseDate)
          
          switch (formData.recurrence_frequency) {
            case 'weekly':
              appointmentDate.setDate(baseDate.getDate() + (i * 7))
              break
            case 'biweekly':
              appointmentDate.setDate(baseDate.getDate() + (i * 14))
              break
            case 'monthly':
              appointmentDate.setMonth(baseDate.getMonth() + i)
              break
          }
          
          appointments.push({
            patient_id: formData.patient_id,
            user_id: user.id,
            date: appointmentDate.toISOString(),
            duration: parseInt(formData.duration),
            notes: formData.notes,
            value: parseFloat(formData.value),
            patient_type: formData.patient_type,
            convenio_nome: formData.patient_type === 'convenio' ? formData.convenio_nome : null,
            convenio_operadora: formData.patient_type === 'convenio' ? formData.convenio_operadora : null,
            status: 'scheduled'
          })
        }
      } else {
        appointments.push({
          patient_id: formData.patient_id,
          user_id: user.id,
          date: new Date(`${formData.date}T${formData.time}`).toISOString().replace('Z', ''),
          duration: parseInt(formData.duration),
          notes: formData.notes,
          value: parseFloat(formData.value),
          patient_type: formData.patient_type,
          convenio_nome: formData.patient_type === 'convenio' ? formData.convenio_nome : null,
          convenio_operadora: formData.patient_type === 'convenio' ? formData.convenio_operadora : null,
          status: 'scheduled'
        })
      }
      
      // Inserir todas as consultas
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointments)
        .select()

      if (error) throw error
      
      console.log('Consultas criadas:', data)
      onClose()
    } catch (error) {
      console.error('Erro ao criar consulta:', error)
      setError(error instanceof Error ? error.message : 'Erro ao criar consulta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Nova Consulta</h2>
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
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Horário</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, duration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a duração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor da Consulta (R$)</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient_type">Tipo de Paciente</Label>
                <Select
                  value={formData.patient_type}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, patient_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">Particular</SelectItem>
                    <SelectItem value="convenio">Convênio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.patient_type === 'convenio' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="convenio_nome">Nome do Convênio</Label>
                    <Input
                      id="convenio_nome"
                      name="convenio_nome"
                      value={formData.convenio_nome}
                      onChange={handleChange}
                      placeholder="Ex: Unimed, SulAmérica, etc."
                      required={formData.patient_type === 'convenio'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="convenio_operadora">Operadora</Label>
                    <Input
                      id="convenio_operadora"
                      name="convenio_operadora"
                      value={formData.convenio_operadora}
                      onChange={handleChange}
                      placeholder="Ex: Plano Básico, Premium, etc."
                      required={formData.patient_type === 'convenio'}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    title="Marcar para criar consultas recorrentes"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_recurring">Consulta Recorrente</Label>
                </div>
              </div>

              {formData.is_recurring && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_frequency">Frequência</Label>
                    <Select
                      value={formData.recurrence_frequency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, recurrence_frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrence_count">Número de Repetições</Label>
                    <Input
                      id="recurrence_count"
                      name="recurrence_count"
                      type="number"
                      min="1"
                      max="52"
                      value={formData.recurrence_count}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </>
              )}
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
                {loading ? 'Agendando...' : 'Agendar Consulta'}
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