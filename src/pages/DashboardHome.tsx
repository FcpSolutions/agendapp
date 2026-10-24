import { DragEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

function dataHojeISO() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function parseDataLocal(isoDate: string) {
  const [ano, mes, dia] = isoDate.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

interface Consulta {
  id: string
  date: string
  duration: number
  status?: string
  patient: {
    id: string
    nome: string
  }
}

interface MovimentoConsulta {
  id: string
  nome: string
  diaDestino: string
  hora: string
  duration: number
}

interface ConflitoHorario {
  consultaId: string
  nomeMovido: string
  diaDestino: string
  horaOriginal: string
  duracao: number
  ocupanteId: string
  ocupanteNome: string
  ocupanteHora: string
  ocupanteDuracao: number
  ocupanteDate: string
  sugestaoMovido: string | null
  sugestaoOcupante: string | null
}

type DialogoMovimento =
  | { tipo: 'recorrencia'; consulta: Consulta; destino: string; hora: string; serie: Consulta[] }
  | { tipo: 'conflito'; movimentos: MovimentoConsulta[]; conflitos: ConflitoHorario[]; escopo: 'uma' | 'todas' }

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const HORA_INICIO = 7
const HORA_FIM = 20

type VisaoCalendario = 'dia' | 'semana' | 'mes'

function slotsDaGrade(consultas: Consulta[]) {
  let inicio = HORA_INICIO * 60
  let fim = HORA_FIM * 60

  consultas.forEach((consulta) => {
    const slot = Math.floor(paraMinutos(horaDaConsulta(consulta.date)) / 30) * 30
    if (slot < inicio) inicio = slot
    if (slot > fim) fim = slot
  })

  const slots: number[] = []
  for (let minuto = inicio; minuto <= fim; minuto += 30) slots.push(minuto)
  return slots
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function classeStatus(status?: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'cancelled':
      return 'bg-red-100 text-red-700 line-through'
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function diaDaConsulta(date: string) {
  return date.slice(0, 10)
}

function horaDaConsulta(date: string) {
  return date.split('T')[1]?.substring(0, 5) || '00:00'
}

function diffDias(de: string, para: string) {
  return Math.round((parseDataLocal(para).getTime() - parseDataLocal(de).getTime()) / 86400000)
}

function somarDiasISO(iso: string, dias: number) {
  const data = parseDataLocal(iso)
  data.setDate(data.getDate() + dias)
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function paraMinutos(hora: string) {
  const [horas, minutos] = hora.split(':').map(Number)
  return horas * 60 + minutos
}

function deMinutos(total: number) {
  const horas = Math.floor(total / 60)
  const minutos = total % 60
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
}

function dataComHora(dia: string, hora: string) {
  return `${dia}T${hora}:00`
}

function intervalosSobrepoem(horaA: string, duracaoA: number, horaB: string, duracaoB: number) {
  const inicioA = paraMinutos(horaA)
  const inicioB = paraMinutos(horaB)
  return inicioA < inicioB + duracaoB && inicioB < inicioA + duracaoA
}

function fazParteDaSerie(origem: Consulta, outra: Consulta) {
  if (outra.id === origem.id) return true
  if (outra.patient.id !== origem.patient.id) return false
  if ((outra.status || 'scheduled') !== 'scheduled') return false
  if (horaDaConsulta(outra.date) !== horaDaConsulta(origem.date)) return false
  if (outra.duration !== origem.duration) return false

  const delta = Math.abs(diffDias(diaDaConsulta(origem.date), diaDaConsulta(outra.date)))
  if (delta === 0) return false
  if (delta % 7 === 0) return true

  const dataOrigem = parseDataLocal(diaDaConsulta(origem.date))
  const dataOutra = parseDataLocal(diaDaConsulta(outra.date))
  return dataOrigem.getDate() === dataOutra.getDate()
}

function proximoHorarioLivre(
  horaDesejada: string,
  duracao: number,
  ocupados: { hora: string; duration: number }[]
) {
  let cursor = Math.ceil((paraMinutos(horaDesejada) + 30) / 30) * 30
  const limite = 20 * 60

  while (cursor + duracao <= limite) {
    const hora = deMinutos(cursor)
    const ocupado = ocupados.some((item) => intervalosSobrepoem(hora, duracao, item.hora, item.duration))
    if (!ocupado) return hora
    cursor += 30
  }

  return null
}

function descreverDia(iso: string) {
  return format(parseDataLocal(iso), "EEEE, d 'de' MMMM", { locale: ptBR })
}

function GradeHoraria({
  dias,
  consultas,
  diaSobre,
  semana,
  onDragOver,
  onDrop,
  onOpenDia,
  renderConsulta,
}: {
  dias: Date[]
  consultas: Consulta[]
  diaSobre: string | null
  semana: boolean
  onDragOver: (chave: string) => void
  onDrop: (event: DragEvent<HTMLDivElement>, destino: string, hora?: string) => void
  onOpenDia: (dia: Date) => void
  renderConsulta: (consulta: Consulta) => ReactNode
}) {
  const chaves = new Set(dias.map((dia) => format(dia, 'yyyy-MM-dd')))
  const slots = slotsDaGrade(consultas.filter((consulta) => chaves.has(diaDaConsulta(consulta.date))))
  const hoje = dataHojeISO()

  return (
    <div className={semana ? 'overflow-x-auto' : ''}>
      <div
        className={`grid border border-gray-200 ${semana ? 'min-w-[52rem]' : ''}`}
        style={{ gridTemplateColumns: `4.5rem repeat(${dias.length}, minmax(0, 1fr))` }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-gray-200 bg-gray-50" />
        {dias.map((dia) => {
          const chave = format(dia, 'yyyy-MM-dd')
          const ehHoje = chave === hoje
          return (
            <button
              key={chave}
              type="button"
              onClick={() => onOpenDia(dia)}
              className={`border-b border-r border-gray-200 px-1 py-2 text-center text-[clamp(0.65rem,0.55rem+0.25vw,0.8rem)] font-medium ${
                ehHoje ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
              }`}
            >
              <span className="block capitalize">{format(dia, 'EEE', { locale: ptBR })}</span>
              <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${ehHoje ? 'bg-blue-600 text-white' : ''}`}>
                {format(dia, 'd')}
              </span>
            </button>
          )
        })}
        {slots.map((slot) => (
          <div key={slot} className="contents">
            <div className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-2 py-2 text-[clamp(0.65rem,0.58rem+0.2vw,0.75rem)] font-medium text-gray-500">
              {deMinutos(slot)}
            </div>
            {dias.map((dia) => {
              const chave = format(dia, 'yyyy-MM-dd')
              const alvo = `${chave}-${slot}`
              const itens = consultas.filter((consulta) => (
                diaDaConsulta(consulta.date) === chave &&
                Math.floor(paraMinutos(horaDaConsulta(consulta.date)) / 30) * 30 === slot
              ))

              return (
                <div
                  key={alvo}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    onDragOver(alvo)
                  }}
                  onDrop={(event) => onDrop(event, chave, deMinutos(slot))}
                  className={`flex min-h-[3.25rem] flex-col gap-1 border-b border-r border-gray-200 p-1 ${
                    chave === hoje ? 'bg-blue-50/40' : 'bg-white'
                  } ${diaSobre === alvo ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                >
                  {itens.map((consulta) => renderConsulta(consulta))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [consultasHoje, setConsultasHoje] = useState(0)
  const [consultasDoDia, setConsultasDoDia] = useState<Consulta[]>([])
  const [receitasMes, setReceitasMes] = useState(0)
  const [despesasMes, setDespesasMes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [carregandoConsultas, setCarregandoConsultas] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [visaoCalendario, setVisaoCalendario] = useState<VisaoCalendario>('dia')
  const [dataSelecionada, setDataSelecionada] = useState(dataHojeISO)
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)
  const [diaSobre, setDiaSobre] = useState<string | null>(null)
  const [dialogoMovimento, setDialogoMovimento] = useState<DialogoMovimento | null>(null)
  const [quemMove, setQuemMove] = useState<'movido' | 'ocupante'>('movido')
  const [salvandoMovimento, setSalvandoMovimento] = useState(false)
  const [avisoMovimento, setAvisoMovimento] = useState<string | null>(null)
  const [consultaEdicao, setConsultaEdicao] = useState<Consulta | null>(null)
  const [dataEdicao, setDataEdicao] = useState('')
  const [horaEdicao, setHoraEdicao] = useState('')
  const intervaloRef = useRef({ inicio: dataHojeISO(), fim: dataHojeISO() })
  const arrastouRef = useRef(false)
  const consultaPedidoRef = useRef(0)

  const mesSelecionado = parseDataLocal(dataSelecionada || dataHojeISO())
  const inicioSemana = dataHojeISO()
  const fimSemana = somarDiasISO(inicioSemana, 7)
  const visao = visaoCalendario === 'dia'
    ? { inicio: dataSelecionada, fim: dataSelecionada }
    : visaoCalendario === 'semana'
      ? { inicio: inicioSemana, fim: fimSemana }
      : {
          inicio: format(startOfMonth(mesSelecionado), 'yyyy-MM-dd'),
          fim: format(endOfMonth(mesSelecionado), 'yyyy-MM-dd'),
        }
  intervaloRef.current = visao

  const fetchAllData = async () => {
    console.log('Iniciando atualização manual dos dados...')
    setRefreshing(true)
    try {
      await Promise.all([
        fetchTotalPacientes(),
        fetchConsultasHoje(),
        fetchConsultasFiltradas(),
        fetchReceitasMes(),
        fetchDespesasMes()
      ])
      setLastUpdate(new Date())
      console.log('Atualização manual concluída com sucesso')
    } catch (error) {
      console.error('Erro durante a atualização manual:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()

    // Atualizar dados a cada 5 minutos
    const interval = setInterval(fetchAllData, 5 * 60 * 1000) // 5 minutos em milissegundos

    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchConsultasFiltradas()
  }, [visaoCalendario, dataSelecionada])

  async function fetchTotalPacientes() {
    try {
      console.log('Iniciando busca de pacientes...')
      
      const { count, error, data } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('ativo', true)
      
      console.log('Resultado da busca de pacientes:', { count, error, data })

      if (error) {
        console.error('Erro ao buscar total de pacientes:', error)
        return
      }

      setTotalPacientes(count || 0)
      console.log('Total de pacientes atualizado:', count)
    } catch (err) {
      console.error('Erro ao buscar total de pacientes:', err)
    }
  }

  function mapConsulta(consulta: {
    id: string
    date: string
    duration: number
    status?: string
    patient_id?: string
    patients?: { id?: string; nome?: string } | { id?: string; nome?: string }[] | null
  }): Consulta {
    let pacienteId = consulta.patient_id || ''
    let pacienteName = 'Paciente não encontrado'

    const paciente = Array.isArray(consulta.patients) ? consulta.patients[0] : consulta.patients
    if (paciente) {
      pacienteName = paciente.nome || pacienteName
      pacienteId = pacienteId || paciente.id || ''
    }

    return {
      id: consulta.id,
      date: consulta.date,
      duration: consulta.duration,
      status: consulta.status,
      patient: {
        id: pacienteId,
        nome: pacienteName
      }
    }
  }

  async function buscarConsultas(inicio: string, fim: string): Promise<Consulta[]> {
    const dataInicio = `${inicio}T00:00:00`
    const dataFim = `${fim}T23:59:59`

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        duration,
        status,
        patient_id,
        patients (
          id,
          nome
        )
      `)
      .gte('date', dataInicio)
      .lte('date', dataFim)
      .order('date', { ascending: true })

    if (error) {
      console.error('Erro ao buscar consultas:', error)
      return []
    }

    return (data || []).map((consulta) => mapConsulta(consulta))
  }

  async function buscarSerie(consulta: Consulta) {
    if (!consulta.patient.id) return [consulta]

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        duration,
        status,
        patient_id,
        patients (
          id,
          nome
        )
      `)
      .eq('patient_id', consulta.patient.id)
      .eq('status', 'scheduled')

    if (error) {
      console.error('Erro ao buscar consultas recorrentes:', error)
      return [consulta]
    }

    const serie = (data || [])
      .map((item) => mapConsulta(item))
      .filter((item) => fazParteDaSerie(consulta, item))

    if (!serie.some((item) => item.id === consulta.id)) {
      serie.push(consulta)
    }

    return serie
  }

  async function analisarMovimento(
    consulta: Consulta,
    destino: string,
    horaNova: string,
    escopo: 'uma' | 'todas',
    serie: Consulta[]
  ) {
    const delta = diffDias(diaDaConsulta(consulta.date), destino)
    const alvos = escopo === 'todas' ? serie : [consulta]
    const movimentos: MovimentoConsulta[] = alvos.map((item) => ({
      id: item.id,
      nome: item.patient.nome,
      diaDestino: somarDiasISO(diaDaConsulta(item.date), delta),
      hora: horaNova,
      duration: item.duration
    }))

    const diasDestino = movimentos.map((item) => item.diaDestino).sort()
    const existentes = await buscarConsultas(diasDestino[0], diasDestino[diasDestino.length - 1])
    const idsMovidos = new Set(movimentos.map((item) => item.id))
    const ocupantes = existentes.filter((item) => item.status !== 'cancelled' && !idsMovidos.has(item.id))
    const conflitos: ConflitoHorario[] = []

    movimentos.forEach((movimento) => {
      const noDia = ocupantes.filter((ocupante) => (
        diaDaConsulta(ocupante.date) === movimento.diaDestino &&
        intervalosSobrepoem(movimento.hora, movimento.duration, horaDaConsulta(ocupante.date), ocupante.duration)
      ))

      if (noDia.length === 0) return

      const outrosMovimentos = movimentos
        .filter((item) => item.id !== movimento.id && item.diaDestino === movimento.diaDestino)
        .map((item) => ({ hora: item.hora, duration: item.duration }))
      const sugestaoMovido = proximoHorarioLivre(movimento.hora, movimento.duration, [
        ...noDia.map((ocupante) => ({ hora: horaDaConsulta(ocupante.date), duration: ocupante.duration })),
        ...outrosMovimentos
      ])

      const reservados = [{ hora: movimento.hora, duration: movimento.duration }]
      noDia.forEach((ocupante) => {
        const ocupacao = [
          ...ocupantes
            .filter((item) => diaDaConsulta(item.date) === movimento.diaDestino && item.id !== ocupante.id)
            .map((item) => ({ hora: horaDaConsulta(item.date), duration: item.duration })),
          ...outrosMovimentos,
          ...reservados
        ]
        const sugestaoOcupante = proximoHorarioLivre(horaDaConsulta(ocupante.date), ocupante.duration, ocupacao)
        if (sugestaoOcupante) {
          reservados.push({ hora: sugestaoOcupante, duration: ocupante.duration })
        }

        conflitos.push({
          consultaId: movimento.id,
          nomeMovido: movimento.nome,
          diaDestino: movimento.diaDestino,
          horaOriginal: movimento.hora,
          duracao: movimento.duration,
          ocupanteId: ocupante.id,
          ocupanteNome: ocupante.patient.nome,
          ocupanteHora: horaDaConsulta(ocupante.date),
          ocupanteDuracao: ocupante.duration,
          ocupanteDate: ocupante.date,
          sugestaoMovido,
          sugestaoOcupante
        })
      })
    })

    if (conflitos.length === 0) {
      await aplicarMovimentos(movimentos.map((item) => ({
        id: item.id,
        date: dataComHora(item.diaDestino, item.hora)
      })), escopo)
      return
    }

    setQuemMove('movido')
    setDialogoMovimento({ tipo: 'conflito', movimentos, conflitos, escopo })
  }

  async function aplicarMovimentos(atualizacoes: { id: string; date: string }[], escopo: 'uma' | 'todas') {
    setSalvandoMovimento(true)
    setAvisoMovimento(null)
    try {
      for (const atualizacao of atualizacoes) {
        const { error } = await supabase
          .from('appointments')
          .update({ date: atualizacao.date })
          .eq('id', atualizacao.id)

        if (error) throw error
      }

      setDialogoMovimento(null)
      setConsultaEdicao(null)
      setAvisoMovimento(escopo === 'todas'
        ? 'Todas as consultas agendadas desta recorrência foram atualizadas.'
        : 'Consulta movida com sucesso.')
      await Promise.all([fetchConsultasHoje(), fetchConsultasFiltradas()])
    } catch (error) {
      console.error('Erro ao mover consulta:', error)
      setAvisoMovimento('Não foi possível mover a consulta. Tente novamente.')
    } finally {
      setSalvandoMovimento(false)
    }
  }

  function abrirEdicao(consulta: Consulta) {
    setConsultaEdicao(consulta)
    setDataEdicao(diaDaConsulta(consulta.date))
    setHoraEdicao(horaDaConsulta(consulta.date))
    setAvisoMovimento(null)
  }

  async function prepararAlteracao(consulta: Consulta, destino: string, hora: string) {
    if (salvandoMovimento) return
    if (diaDaConsulta(consulta.date) === destino && horaDaConsulta(consulta.date) === hora) {
      setConsultaEdicao(null)
      return
    }

    setAvisoMovimento(null)
    const serie = await buscarSerie(consulta)
    if (serie.length > 1) {
      setConsultaEdicao(null)
      setDialogoMovimento({ tipo: 'recorrencia', consulta, destino, hora, serie })
      return
    }

    await analisarMovimento(consulta, destino, hora, 'uma', serie)
  }

  async function iniciarMovimento(consulta: Consulta, destino: string, horaSlot?: string) {
    if (consulta.status === 'cancelled' || consulta.status === 'completed') return
    const horaAtual = horaDaConsulta(consulta.date)
    const mesmoDia = diaDaConsulta(consulta.date) === destino

    if (!horaSlot) {
      if (mesmoDia) return
      await prepararAlteracao(consulta, destino, horaAtual)
      return
    }

    const slotAtual = Math.floor(paraMinutos(horaAtual) / 30) * 30
    if (mesmoDia && slotAtual === paraMinutos(horaSlot)) return
    await prepararAlteracao(consulta, destino, horaSlot)
  }

  async function confirmarEdicao() {
    if (!consultaEdicao || !dataEdicao || !horaEdicao) return
    if (consultaEdicao.status === 'cancelled' || consultaEdicao.status === 'completed') return
    const consulta = consultaEdicao
    setConsultaEdicao(null)
    await prepararAlteracao(consulta, dataEdicao, horaEdicao.slice(0, 5))
  }

  async function atualizarConsultasEReceita() {
    await Promise.all([fetchConsultasHoje(), fetchConsultasFiltradas(), fetchReceitasMes()])
  }

  async function cancelarConsulta() {
    if (!consultaEdicao || salvandoMovimento || consultaEdicao.status === 'cancelled') return
    const consulta = consultaEdicao
    const confirmar = confirm(
      `Cancelar o atendimento de ${consulta.patient.nome}? A consulta não será reposta e o valor continua no recebimento.`
    )
    if (!confirmar) return

    setSalvandoMovimento(true)
    setAvisoMovimento(null)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', consulta.id)

      if (error) throw error
      setConsultaEdicao(null)
      setAvisoMovimento('Atendimento cancelado. O valor continua no recebimento e a consulta não foi reposta.')
      await atualizarConsultasEReceita()
    } catch (error) {
      console.error('Erro ao cancelar consulta:', error)
      setAvisoMovimento('Não foi possível cancelar o atendimento. Tente novamente.')
    } finally {
      setSalvandoMovimento(false)
    }
  }

  async function concluirConsulta() {
    if (!consultaEdicao || salvandoMovimento || consultaEdicao.status === 'completed' || consultaEdicao.status === 'cancelled') return
    const consulta = consultaEdicao
    const confirmar = confirm(
      `Concluir o atendimento de ${consulta.patient.nome}? Ele fica registrado como realizado e o valor continua no recebimento.`
    )
    if (!confirmar) return

    setSalvandoMovimento(true)
    setAvisoMovimento(null)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', consulta.id)

      if (error) throw error
      setConsultaEdicao(null)
      setAvisoMovimento('Atendimento concluído. Ele permanece na agenda como realizado e o valor continua no recebimento.')
      await atualizarConsultasEReceita()
    } catch (error) {
      console.error('Erro ao concluir consulta:', error)
      setAvisoMovimento('Não foi possível concluir o atendimento. Tente novamente.')
    } finally {
      setSalvandoMovimento(false)
    }
  }

  async function excluirConsulta() {
    if (!consultaEdicao || salvandoMovimento) return
    const consulta = consultaEdicao
    const confirmar = confirm(
      `Excluir o atendimento de ${consulta.patient.nome}? Ele sairá do calendário e o valor não será recebido.`
    )
    if (!confirmar) return

    setSalvandoMovimento(true)
    setAvisoMovimento(null)
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', consulta.id)

      if (error) throw error
      setConsultaEdicao(null)
      setAvisoMovimento('Atendimento excluído. Ele saiu do calendário e o valor não entra no recebimento.')
      await atualizarConsultasEReceita()
    } catch (error) {
      console.error('Erro ao excluir consulta:', error)
      setAvisoMovimento('Não foi possível excluir o atendimento. Tente novamente.')
    } finally {
      setSalvandoMovimento(false)
    }
  }

  async function confirmarEscopo(escopo: 'uma' | 'todas') {
    if (dialogoMovimento?.tipo !== 'recorrencia') return
    const { consulta, destino, hora, serie } = dialogoMovimento
    setDialogoMovimento(null)
    await analisarMovimento(consulta, destino, hora, escopo, serie)
  }

  async function confirmarConflito() {
    if (dialogoMovimento?.tipo !== 'conflito') return
    const { movimentos, conflitos, escopo } = dialogoMovimento
    const sugestaoEscolhida = quemMove === 'movido' ? 'sugestaoMovido' : 'sugestaoOcupante'
    if (conflitos.some((conflito) => !conflito[sugestaoEscolhida])) {
      setAvisoMovimento('Não há horário livre até as 20:00 para a opção escolhida.')
      return
    }

    const atualizacoes = new Map<string, string>()
    const conflitosPorConsulta = new Map<string, ConflitoHorario>()
    conflitos.forEach((conflito) => {
      if (!conflitosPorConsulta.has(conflito.consultaId)) {
        conflitosPorConsulta.set(conflito.consultaId, conflito)
      }
    })

    movimentos.forEach((movimento) => {
      const conflito = conflitosPorConsulta.get(movimento.id)
      const hora = quemMove === 'movido' && conflito ? conflito.sugestaoMovido : movimento.hora
      if (hora) atualizacoes.set(movimento.id, dataComHora(movimento.diaDestino, hora))
    })

    if (quemMove === 'ocupante') {
      const ocupantesVistos = new Set<string>()
      conflitos.forEach((conflito) => {
        if (ocupantesVistos.has(conflito.ocupanteId) || !conflito.sugestaoOcupante) return
        ocupantesVistos.add(conflito.ocupanteId)
        atualizacoes.set(
          conflito.ocupanteId,
          dataComHora(diaDaConsulta(conflito.ocupanteDate), conflito.sugestaoOcupante)
        )
      })
    }

    await aplicarMovimentos(
      Array.from(atualizacoes, ([id, date]) => ({ id, date })),
      escopo
    )
  }

  async function fetchConsultasHoje() {
    try {
      const consultas = await buscarConsultas(dataHojeISO(), dataHojeISO())
      setConsultasHoje(consultas.length)
    } catch (err) {
      console.error('Erro ao buscar consultas de hoje:', err)
    }
  }

  async function fetchConsultasFiltradas() {
    const pedido = ++consultaPedidoRef.current
    const { inicio, fim } = intervaloRef.current

    if (!inicio || !fim || inicio > fim) {
      if (pedido === consultaPedidoRef.current) setConsultasDoDia([])
      return
    }

    try {
      setCarregandoConsultas(true)
      const consultas = await buscarConsultas(inicio, fim)
      if (pedido !== consultaPedidoRef.current) return
      setConsultasDoDia(consultas)
    } catch (err) {
      if (pedido !== consultaPedidoRef.current) return
      console.error('Erro ao buscar consultas do período:', err)
    } finally {
      if (pedido === consultaPedidoRef.current) setCarregandoConsultas(false)
    }
  }

  function tituloConsultas() {
    if (visaoCalendario === 'dia') {
      return capitalizar(format(parseDataLocal(dataSelecionada), "EEEE, d 'de' MMMM", { locale: ptBR }))
    }

    if (visaoCalendario === 'semana') {
      return `${format(parseDataLocal(inicioSemana), "d 'de' MMMM", { locale: ptBR })} a ${format(parseDataLocal(fimSemana), "d 'de' MMMM", { locale: ptBR })}`
    }

    return capitalizar(format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR }))
  }

  function moverPeriodo(delta: number) {
    if (visaoCalendario === 'dia') {
      setDataSelecionada(somarDiasISO(dataSelecionada, delta))
      return
    }

    setDataSelecionada(format(addMonths(mesSelecionado, delta), 'yyyy-MM-dd'))
  }

  function selecionarDia(dia: Date) {
    setDataSelecionada(format(dia, 'yyyy-MM-dd'))
    setVisaoCalendario('dia')
  }

  function consultasNoDia(dia: Date) {
    const chave = format(dia, 'yyyy-MM-dd')
    return consultasDoDia.filter((consulta) => consulta.date.slice(0, 10) === chave)
  }

  function mensagemSemConsultas() {
    if (visaoCalendario === 'dia') return 'Nenhuma consulta agendada neste dia'
    if (visaoCalendario === 'semana') return 'Nenhuma consulta agendada nesta semana'
    return 'Nenhuma consulta agendada neste mês'
  }

  function soltarConsulta(event: DragEvent<HTMLDivElement>, destino: string, horaSlot?: string) {
    event.preventDefault()
    arrastouRef.current = true
    const id = event.dataTransfer.getData('text/plain') || arrastandoId
    setArrastandoId(null)
    setDiaSobre(null)
    const consulta = consultasDoDia.find((item) => item.id === id)
    if (consulta) void iniciarMovimento(consulta, destino, horaSlot)
  }

  function renderConsulta(consulta: Consulta) {
    return (
      <div
        key={consulta.id}
        draggable={consulta.status !== 'cancelled' && consulta.status !== 'completed'}
        onDragStart={(event) => {
          if (consulta.status === 'cancelled' || consulta.status === 'completed') {
            event.preventDefault()
            return
          }
          event.stopPropagation()
          arrastouRef.current = true
          event.dataTransfer.setData('text/plain', consulta.id)
          event.dataTransfer.effectAllowed = 'move'
          setArrastandoId(consulta.id)
        }}
        onDragEnd={() => {
          setArrastandoId(null)
          setDiaSobre(null)
          window.setTimeout(() => {
            arrastouRef.current = false
          }, 0)
        }}
        onClick={(event) => {
          event.stopPropagation()
          if (arrastouRef.current) return
          abrirEdicao(consulta)
        }}
        title={`${horaDaConsulta(consulta.date)} ${consulta.patient.nome}. Clique para editar, cancelar ou excluir.`}
        className={`cursor-pointer truncate rounded px-1 py-0.5 text-[clamp(0.65rem,0.58rem+0.2vw,0.75rem)] leading-tight active:cursor-grabbing ${classeStatus(consulta.status)} ${
          arrastandoId === consulta.id ? 'opacity-40' : ''
        }`}
      >
        <span className="font-semibold">{horaDaConsulta(consulta.date)}</span>
        <span> {consulta.patient.nome}</span>
      </div>
    )
  }

  async function fetchReceitasMes() {
    try {
      const hoje = new Date()
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      
      const dataInicio = primeiroDiaMes.toISOString().slice(0, 10)
      const dataFim = ultimoDiaMes.toISOString().slice(0, 10)
      
      console.log('Buscando receitas do mês:', { dataInicio, dataFim })

      const { data, error } = await supabase
        .from('appointments')
        .select('value, paga')
        .eq('paga', true)
        .filter('date', 'gte', `${dataInicio}T00:00:00`)
        .filter('date', 'lte', `${dataFim}T23:59:59`)

      console.log('Resultado da busca de receitas:', { data, error })

      if (error) {
        console.error('Erro ao buscar receitas do mês:', error)
        return
      }

      // Somando os valores das consultas
      const totalReceitas = data?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0
      setReceitasMes(totalReceitas)
      console.log('Total de receitas do mês:', totalReceitas)
    } catch (err) {
      console.error('Erro ao buscar receitas do mês:', err)
    }
  }

  async function fetchDespesasMes() {
    try {
      const hoje = new Date()
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      
      const dataInicio = primeiroDiaMes.toISOString().slice(0, 10)
      const dataFim = ultimoDiaMes.toISOString().slice(0, 10)
      
      console.log('Buscando despesas do mês:', { dataInicio, dataFim })

      const { data, error } = await supabase
        .from('despesas')
        .select('valor')
        .filter('data', 'gte', dataInicio)
        .filter('data', 'lte', dataFim)

      if (error) {
        console.error('Erro ao buscar despesas do mês:', error)
        return
      }

      const totalDespesas = data?.reduce((acc, curr) => acc + curr.valor, 0) || 0
      setDespesasMes(totalDespesas)
      console.log('Total de despesas do mês:', totalDespesas)
    } catch (err) {
      console.error('Erro ao buscar despesas do mês:', err)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-bold text-gray-800 text-[clamp(1.25rem,1rem+0.8vw,1.5rem)]">Dashboard</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          {lastUpdate && (
            <span className="hidden text-gray-500 sm:inline text-[clamp(0.75rem,0.7rem+0.2vw,0.875rem)]">
              Última atualização: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={fetchAllData} 
            disabled={refreshing}
            className="flex items-center gap-2 px-3 text-[clamp(0.75rem,0.7rem+0.2vw,0.875rem)] sm:px-4"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>
      
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="font-semibold text-gray-700 text-[clamp(0.9rem,0.8rem+0.35vw,1.125rem)]">Total de Pacientes</h2>
          <p className="mt-2 font-bold text-blue-600 text-[clamp(1.5rem,1.1rem+1.4vw,1.875rem)]">
            {loading ? '...' : totalPacientes}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="font-semibold text-gray-700 text-[clamp(0.9rem,0.8rem+0.35vw,1.125rem)]">Consultas Hoje</h2>
          <p className="mt-2 font-bold text-yellow-600 text-[clamp(1.5rem,1.1rem+1.4vw,1.875rem)]">
            {loading ? '...' : consultasHoje}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="font-semibold text-gray-700 text-[clamp(0.9rem,0.8rem+0.35vw,1.125rem)]">Receitas do Mês</h2>
          <p className="mt-2 font-bold text-green-600 text-[clamp(1.5rem,1.1rem+1.4vw,1.875rem)]">
            {loading ? '...' : formatarMoeda(receitasMes)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <h2 className="font-semibold text-gray-700 text-[clamp(0.9rem,0.8rem+0.35vw,1.125rem)]">Despesas do Mês</h2>
          <p className="mt-2 font-bold text-red-600 text-[clamp(1.5rem,1.1rem+1.4vw,1.875rem)]">
            {loading ? '...' : formatarMoeda(despesasMes)}
          </p>
        </div>
      </div>

      {/* Quadro de Consultas do Dia */}
      <div className="rounded-lg bg-white p-4 shadow sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {visaoCalendario !== 'semana' && (
              <button
                type="button"
                aria-label={visaoCalendario === 'dia' ? 'Dia anterior' : 'Mês anterior'}
                onClick={() => moverPeriodo(-1)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            <h2 className="min-w-0 truncate font-semibold leading-snug text-gray-800 text-[clamp(0.8125rem,0.45rem+1.15vw,1.25rem)]">
              {tituloConsultas()}
            </h2>
            {visaoCalendario !== 'semana' && (
              <button
                type="button"
                aria-label={visaoCalendario === 'dia' ? 'Próximo dia' : 'Próximo mês'}
                onClick={() => moverPeriodo(1)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className="flex overflow-hidden rounded-md border border-gray-200">
              {([
                ['dia', 'Dia'],
                ['semana', 'Semana'],
                ['mes', 'Mês'],
              ] as const).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setVisaoCalendario(valor)}
                  className={`px-2 py-1.5 font-medium text-[clamp(0.7rem,0.62rem+0.25vw,0.875rem)] sm:px-3 sm:py-2 ${
                    visaoCalendario === valor ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {visaoCalendario === 'dia' && (
              <>
                <Input
                  id="dataSelecionada"
                  type="date"
                  aria-label="Data"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="h-8 w-[8.4rem] px-2 text-[clamp(0.7rem,0.62rem+0.25vw,0.875rem)] sm:h-9 sm:w-[9.4rem] md:h-10 md:w-auto"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDataSelecionada(dataHojeISO())}
                  className="h-8 px-2 text-[clamp(0.7rem,0.62rem+0.25vw,0.875rem)] sm:h-9 sm:px-3 md:h-10"
                >
                  Hoje
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[clamp(0.65rem,0.58rem+0.2vw,0.75rem)] text-gray-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Agendada</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Concluída</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Cancelada</span>
          <span>Clique em uma consulta para editar data e horário.</span>
          {carregandoConsultas && <span>Carregando consultas...</span>}
          {!carregandoConsultas && consultasDoDia.length === 0 && (
            <span>{mensagemSemConsultas()}</span>
          )}
        </div>
        {avisoMovimento && (
          <p className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{avisoMovimento}</p>
        )}

        {visaoCalendario === 'mes' ? (
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {DIAS_SEMANA.map((diaSemana) => (
              <div
                key={diaSemana}
                className="pb-1 text-center font-medium text-gray-500 text-[clamp(0.65rem,0.55rem+0.25vw,0.8rem)]"
              >
                {diaSemana}
              </div>
            ))}
            {eachDayOfInterval({
              start: startOfWeek(startOfMonth(mesSelecionado), { weekStartsOn: 1 }),
              end: endOfWeek(endOfMonth(mesSelecionado), { weekStartsOn: 1 }),
            }).map((dia) => {
              const noMes = isSameMonth(dia, mesSelecionado)
              const chave = format(dia, 'yyyy-MM-dd')
              const consultas = noMes ? consultasNoDia(dia) : []
              const ehHoje = chave === dataHojeISO()
              const recebendo = diaSobre === chave

              return (
                <div
                  key={chave}
                  onClick={() => {
                    if (arrastouRef.current) {
                      arrastouRef.current = false
                      return
                    }
                    selecionarDia(dia)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    if (diaSobre !== chave) setDiaSobre(chave)
                  }}
                  onDrop={(event) => soltarConsulta(event, chave)}
                  className={`flex min-h-[4.25rem] flex-col rounded-md border p-1 text-left transition-colors sm:min-h-[6.25rem] sm:p-1.5 ${
                    noMes ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-transparent bg-gray-50'
                  } ${ehHoje ? 'border-blue-300 bg-blue-50' : ''} ${recebendo ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <span
                    className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[clamp(0.65rem,0.58rem+0.2vw,0.8rem)] sm:h-6 sm:w-6 ${
                      ehHoje ? 'bg-blue-600 font-semibold text-white' : noMes ? 'text-gray-700' : 'text-gray-300'
                    }`}
                  >
                    {format(dia, 'd')}
                  </span>
                  <div className="flex max-h-24 min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                    {consultas.map((consulta) => renderConsulta(consulta))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <GradeHoraria
            dias={visaoCalendario === 'dia'
              ? [parseDataLocal(dataSelecionada)]
              : eachDayOfInterval({ start: parseDataLocal(inicioSemana), end: parseDataLocal(fimSemana) })}
            consultas={consultasDoDia}
            diaSobre={diaSobre}
            semana={visaoCalendario === 'semana'}
            onDragOver={(chave) => {
              if (diaSobre !== chave) setDiaSobre(chave)
            }}
            onDrop={soltarConsulta}
            onOpenDia={(dia) => {
              if (arrastouRef.current) {
                arrastouRef.current = false
                return
              }
              selecionarDia(dia)
            }}
            renderConsulta={renderConsulta}
          />
        )}
      </div>

      <Dialog
        open={consultaEdicao !== null}
        onOpenChange={(aberto) => {
          if (!aberto && !salvandoMovimento) setConsultaEdicao(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar consulta</DialogTitle>
            <DialogDescription>
              {consultaEdicao
                ? `${consultaEdicao.patient.nome}. Altere a data e o horário, conclua, cancele ou exclua o atendimento. A Agenda usa o mesmo registro.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="dataEdicao" className="text-sm font-medium text-gray-700">Data</label>
              <Input
                id="dataEdicao"
                type="date"
                value={dataEdicao}
                onChange={(event) => setDataEdicao(event.target.value)}
                disabled={consultaEdicao?.status === 'cancelled' || consultaEdicao?.status === 'completed'}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="horaEdicao" className="text-sm font-medium text-gray-700">Horário</label>
              <Input
                id="horaEdicao"
                type="time"
                value={horaEdicao}
                onChange={(event) => setHoraEdicao(event.target.value)}
                disabled={consultaEdicao?.status === 'cancelled' || consultaEdicao?.status === 'completed'}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void concluirConsulta()}
                disabled={salvandoMovimento || consultaEdicao?.status === 'completed' || consultaEdicao?.status === 'cancelled'}
              >
                Concluído
              </Button>
              <p className="mt-2 text-xs text-gray-600">
                O atendimento foi realizado. O valor continua no recebimento.
              </p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void cancelarConsulta()}
                disabled={salvandoMovimento || consultaEdicao?.status === 'cancelled'}
              >
                Cancelar
              </Button>
              <p className="mt-2 text-xs text-gray-600">
                O paciente desistiu. O valor continua no recebimento e a consulta não é reposta.
              </p>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => void excluirConsulta()}
                disabled={salvandoMovimento}
              >
                Excluir
              </Button>
              <p className="mt-2 text-xs text-gray-600">
                O atendimento não será realizado. Sai do calendário e o valor não é recebido.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsultaEdicao(null)} disabled={salvandoMovimento}>
              Fechar
            </Button>
            <Button
              onClick={() => void confirmarEdicao()}
              disabled={salvandoMovimento || !dataEdicao || !horaEdicao || consultaEdicao?.status === 'cancelled' || consultaEdicao?.status === 'completed'}
            >
              {salvandoMovimento ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogoMovimento?.tipo === 'recorrencia'}
        onOpenChange={(aberto) => {
          if (!aberto && !salvandoMovimento) setDialogoMovimento(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consulta recorrente</DialogTitle>
            <DialogDescription>
              {dialogoMovimento?.tipo === 'recorrencia'
                ? `${dialogoMovimento.consulta.patient.nome} tem outras consultas já agendadas no mesmo horário. A alteração deve valer apenas para esta consulta ou para todas as consultas já agendadas?`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoMovimento(null)} disabled={salvandoMovimento}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => void confirmarEscopo('uma')} disabled={salvandoMovimento}>
              Apenas esta
            </Button>
            <Button onClick={() => void confirmarEscopo('todas')} disabled={salvandoMovimento}>
              Todas as agendadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogoMovimento?.tipo === 'conflito'}
        onOpenChange={(aberto) => {
          if (!aberto && !salvandoMovimento) setDialogoMovimento(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conflito de horário</DialogTitle>
            <DialogDescription>
              O horário de destino já está ocupado. Escolha qual paciente deve ir para o próximo horário livre.
            </DialogDescription>
          </DialogHeader>
          {dialogoMovimento?.tipo === 'conflito' && (
            <div className="space-y-3 text-sm text-gray-700">
              {dialogoMovimento.conflitos.map((conflito) => (
                <div key={`${conflito.consultaId}-${conflito.ocupanteId}`} className="rounded-md bg-amber-50 p-3">
                  <p>
                    <strong>{conflito.nomeMovido}</strong> às {conflito.horaOriginal} de {descreverDia(conflito.diaDestino)} coincide com <strong>{conflito.ocupanteNome}</strong>, já agendado nesse horário.
                  </p>
                  <p className="mt-1">
                    Próximo horário livre para {conflito.nomeMovido}: {conflito.sugestaoMovido || 'não há até as 20:00'}.
                    {' '}Próximo horário livre para {conflito.ocupanteNome}: {conflito.sugestaoOcupante || 'não há até as 20:00'}.
                  </p>
                </div>
              ))}
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="quemMove"
                  checked={quemMove === 'movido'}
                  onChange={() => setQuemMove('movido')}
                />
                <span>Mover o paciente que você está alterando para o próximo horário livre. O paciente que já estava no horário permanece.</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="quemMove"
                  checked={quemMove === 'ocupante'}
                  onChange={() => setQuemMove('ocupante')}
                />
                <span>Mover o paciente que já ocupa o horário para o próximo horário livre. O paciente alterado fica no horário escolhido.</span>
              </label>
              {avisoMovimento && <p className="text-red-600">{avisoMovimento}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoMovimento(null)} disabled={salvandoMovimento}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmarConflito()} disabled={salvandoMovimento}>
              {salvandoMovimento ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 