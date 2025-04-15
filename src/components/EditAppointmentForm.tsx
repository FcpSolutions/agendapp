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

interface Appointment {
  id: string
  patient_id: string
  date: string
  duration: number
  notes: string
  status: string
  value: number
  patient_type?: string
  convenio_nome?: string
  convenio_operadora?: string
}

interface EditAppointmentFormProps {
  appointment: Appointment
  onClose: () => void
  isOpen: boolean
  onSuccess: () => void
}

export function EditAppointmentForm({ appointment, onClose, isOpen, onSuccess }: EditAppointmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [showScrollButton, setShowScrollButton] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    patient_id: appointment.patient_id,
    date: appointment.date.split('T')[0],
    time: extractTimeFromDate(appointment.date),
    duration: appointment.duration.toString(),
    notes: appointment.notes || '',
    status: appointment.status,
    value: appointment.value?.toString() || '0.00',
    patient_type: appointment.patient_type || 'particular',
    convenio_nome: appointment.convenio_nome || '',
    convenio_operadora: appointment.convenio_operadora || ''
  })

  // Função para extrair hora da data com a mesma lógica usada no grid
  function extractTimeFromDate(dateString: string): string {
    try {
      // Extrair a parte de hora diretamente da string
      const timePart = dateString.split('T')[1]?.substring(0, 5);
      console.log('Form: Hora extraída diretamente:', timePart);
      return timePart || '00:00';
    } catch (error) {
      console.error('Form: Erro ao extrair hora da data:', error);
      return '00:00';
    }
  }

  useEffect(() => {
    console.log('Appointment original:', {
      id: appointment.id,
      date: appointment.date,
      formattedDate: appointment.date.split('T')[0],
      formattedTime: extractTimeFromDate(appointment.date)
    })
  }, [appointment])

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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw new Error('Erro de autenticação: ' + userError.message)
      if (!user) throw new Error('Usuário não autenticado')

      // Formatação manual da data e hora para manter fuso horário local
      const dateObj = new Date(`${formData.date}T${formData.time}`);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      console.log('Data local a ser salva:', formattedDate);

      const { error } = await supabase
        .from('appointments')
        .update({
          patient_id: formData.patient_id,
          date: formattedDate,
          duration: parseInt(formData.duration),
          notes: formData.notes,
          status: formData.status,
          value: parseFloat(formData.value),
          patient_type: formData.patient_type,
          convenio_nome: formData.patient_type === 'convenio' ? formData.convenio_nome : null,
          convenio_operadora: formData.patient_type === 'convenio' ? formData.convenio_operadora : null
        })
        .eq('id', appointment.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar consulta:', error)
      setError(error instanceof Error ? error.message : 'Erro ao atualizar consulta')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Editar Consulta</h2>
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
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Adicione observações sobre a consulta"
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
                {loading ? 'Salvando...' : 'Salvar Alterações'}
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