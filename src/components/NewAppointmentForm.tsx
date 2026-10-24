import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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

const DIAS_SEMANA = [
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
]

function normalizarTexto(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function montarSessoes(quantidade: number, atual: { dia: string; time: string }[], horaPadrao: string) {
  const faltam = Math.max(0, quantidade - 1)
  const proximas = atual.slice(0, faltam)
  const usados = new Set(proximas.map((sessao) => sessao.dia))
  while (proximas.length < faltam) {
    const dia = DIAS_SEMANA.find((item) => !usados.has(item.value))?.value || '1'
    usados.add(dia)
    proximas.push({ dia, time: horaPadrao || '09:00' })
  }
  return proximas
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
    recurrence_count: '4', // número de repetições
    vezes_na_semana: '1'
  })
  const [sessoesSemana, setSessoesSemana] = useState<{ dia: string; time: string }[]>([])
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [listaAberta, setListaAberta] = useState(false)
  const [posicaoLista, setPosicaoLista] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 })
  const formRef = useRef<HTMLDivElement>(null)
  const campoPacienteRef = useRef<HTMLInputElement>(null)
  const listaPacientesRef = useRef<HTMLUListElement>(null)

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
        .eq('ativo', true)
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

  const pacienteSelecionado = patients.find((patient) => patient.id === formData.patient_id)
  const pacientesFiltrados = patients.filter((patient) =>
    normalizarTexto(patient.nome).includes(normalizarTexto(buscaPaciente))
  )

  const atualizarPosicaoLista = () => {
    const campo = campoPacienteRef.current
    if (!campo) return
    const rect = campo.getBoundingClientRect()
    const espacoAbaixo = window.innerHeight - rect.bottom - 12
    setPosicaoLista({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(160, Math.min(240, espacoAbaixo))
    })
  }

  useEffect(() => {
    if (!listaAberta) return

    atualizarPosicaoLista()

    const fecharAoClicarFora = (event: MouseEvent) => {
      const alvo = event.target as Node
      if (campoPacienteRef.current?.contains(alvo) || listaPacientesRef.current?.contains(alvo)) return
      setListaAberta(false)
    }

    window.addEventListener('resize', atualizarPosicaoLista)
    window.addEventListener('scroll', atualizarPosicaoLista, true)
    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => {
      window.removeEventListener('resize', atualizarPosicaoLista)
      window.removeEventListener('scroll', atualizarPosicaoLista, true)
      document.removeEventListener('mousedown', fecharAoClicarFora)
    }
  }, [listaAberta])

  const selecionarPaciente = (patient: Patient) => {
    handlePatientChange(patient.id)
    setBuscaPaciente('')
    setListaAberta(false)
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
      if (!formData.patient_id) throw new Error('Selecione um paciente')
      
      // Criar array de datas para consultas recorrentes
      const appointments = []
      const baseDate = new Date(`${formData.date}T${formData.time}`)
      
      const criarConsulta = (appointmentDate: Date) => {
        const year = appointmentDate.getFullYear()
        const month = String(appointmentDate.getMonth() + 1).padStart(2, '0')
        const day = String(appointmentDate.getDate()).padStart(2, '0')
        const hours = String(appointmentDate.getHours()).padStart(2, '0')
        const minutes = String(appointmentDate.getMinutes()).padStart(2, '0')
        const seconds = String(appointmentDate.getSeconds()).padStart(2, '0')

        return {
          patient_id: formData.patient_id,
          user_id: user.id,
          date: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`,
          duration: parseInt(formData.duration),
          notes: formData.notes,
          value: parseFloat(formData.value),
          patient_type: formData.patient_type,
          convenio_nome: formData.patient_type === 'convenio' ? formData.convenio_nome : null,
          convenio_operadora: formData.patient_type === 'convenio' ? formData.convenio_operadora : null,
          status: 'scheduled',
          paga: false
        }
      }

      if (formData.is_recurring) {
        const count = parseInt(formData.recurrence_count)
        const semanal = formData.recurrence_frequency === 'weekly'
        const vezes = semanal ? Math.min(7, Math.max(1, parseInt(formData.vezes_na_semana) || 1)) : 1

        if (semanal && vezes > 1) {
          const diaBase = String(baseDate.getDay())
          const dias = [diaBase, ...sessoesSemana.slice(0, vezes - 1).map((sessao) => sessao.dia)]
          if (dias.some((dia) => !dia) || new Set(dias).size !== dias.length) {
            throw new Error('Escolha um dia diferente para cada atendimento da semana.')
          }
        }

        for (let i = 0; i < count; i++) {
          if (semanal && vezes > 1) {
            const semana = new Date(baseDate)
            semana.setDate(baseDate.getDate() + (i * 7))
            appointments.push(criarConsulta(semana))

            sessoesSemana.slice(0, vezes - 1).forEach((sessao) => {
              const data = new Date(semana)
              data.setDate(semana.getDate() + (Number(sessao.dia) - semana.getDay()))
              const [hora, minuto] = (sessao.time || formData.time).split(':')
              data.setHours(Number(hora), Number(minuto), 0, 0)
              appointments.push(criarConsulta(data))
            })
            continue
          }

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
          
          appointments.push(criarConsulta(appointmentDate))
        }
      } else {
        // Formatação manual da data e hora para manter fuso horário local
        const dateObj = new Date(`${formData.date}T${formData.time}`);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
        
        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        
        appointments.push({
          patient_id: formData.patient_id,
          user_id: user.id,
          date: formattedDate,
          duration: parseInt(formData.duration),
          notes: formData.notes,
          value: parseFloat(formData.value),
          patient_type: formData.patient_type,
          convenio_nome: formData.patient_type === 'convenio' ? formData.convenio_nome : null,
          convenio_operadora: formData.patient_type === 'convenio' ? formData.convenio_operadora : null,
          status: 'scheduled',
          paga: false
        })
      }
      
      appointments.sort((a, b) => a.date.localeCompare(b.date))

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
                <Input
                  ref={campoPacienteRef}
                  id="patient_id"
                  value={listaAberta ? buscaPaciente : (pacienteSelecionado?.nome ?? '')}
                  onChange={(event) => {
                    setBuscaPaciente(event.target.value)
                    setListaAberta(true)
                    if (formData.patient_id) handlePatientChange('')
                  }}
                  onFocus={() => {
                    setBuscaPaciente('')
                    setListaAberta(true)
                  }}
                  placeholder="Selecione um paciente"
                  autoComplete="off"
                  aria-expanded={listaAberta}
                  aria-controls="lista-pacientes-consulta"
                  role="combobox"
                />
                {listaAberta && createPortal(
                  <ul
                    ref={listaPacientesRef}
                    id="lista-pacientes-consulta"
                    role="listbox"
                    style={{
                      top: posicaoLista.top,
                      left: posicaoLista.left,
                      width: posicaoLista.width,
                      maxHeight: posicaoLista.maxHeight
                    }}
                    className="fixed z-[80] overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-md"
                  >
                    {pacientesFiltrados.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-gray-500">Nenhum paciente encontrado</li>
                    ) : (
                      pacientesFiltrados.map((patient) => (
                        <li key={patient.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={patient.id === formData.patient_id}
                            className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                            onMouseDown={(event) => {
                              event.preventDefault()
                              selecionarPaciente(patient)
                            }}
                          >
                            {patient.nome}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>,
                  document.body
                )}
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

                  {formData.recurrence_frequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label htmlFor="vezes_na_semana">Quantidade de vezes na semana</Label>
                      <Select
                        value={formData.vezes_na_semana}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, vezes_na_semana: value }))
                          setSessoesSemana(montarSessoes(parseInt(value), sessoesSemana, formData.time))
                        }}
                      >
                        <SelectTrigger id="vezes_na_semana">
                          <SelectValue placeholder="Selecione a quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((quantidade) => (
                            <SelectItem key={quantidade} value={String(quantidade)}>
                              {quantidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.recurrence_frequency === 'weekly' && Number(formData.vezes_na_semana) > 1 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        A primeira vez usa a data e o horário informados acima. Escolha os outros dias da semana.
                      </p>
                      {sessoesSemana.map((sessao, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor={`dia-semana-${index}`}>{index + 2}ª vez</Label>
                            <Select
                              value={sessao.dia}
                              onValueChange={(value) => {
                                setSessoesSemana((atual) => atual.map((item, itemIndex) => (
                                  itemIndex === index ? { ...item, dia: value } : item
                                )))
                              }}
                            >
                              <SelectTrigger id={`dia-semana-${index}`}>
                                <SelectValue placeholder="Dia" />
                              </SelectTrigger>
                              <SelectContent>
                                {DIAS_SEMANA.map((dia) => (
                                  <SelectItem key={dia.value} value={dia.value}>
                                    {dia.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`hora-semana-${index}`}>Horário</Label>
                            <Input
                              id={`hora-semana-${index}`}
                              type="time"
                              value={sessao.time}
                              onChange={(event) => {
                                const valor = event.target.value
                                setSessoesSemana((atual) => atual.map((item, itemIndex) => (
                                  itemIndex === index ? { ...item, time: valor } : item
                                )))
                              }}
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="recurrence_count">
                      {formData.recurrence_frequency === 'weekly' && Number(formData.vezes_na_semana) > 1
                        ? 'Número de semanas'
                        : 'Número de Repetições'}
                    </Label>
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