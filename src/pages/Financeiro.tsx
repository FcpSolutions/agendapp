import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PacienteAgenda {
  id: string
  nome: string
  ativo?: boolean
}

interface ConsultaFinanceira {
  id: string
  date: string
  status?: string | null
  value: number | null
  patient_type: string | null
  patient_id: string
  patients: PacienteAgenda | PacienteAgenda[] | null
}

interface ConsultasNoMes {
  chave: string
  quantidade: number
}

interface RecebimentoParticular {
  id: string
  nome: string
  ativo: boolean
  sessoes: number
  valor: number
  ultimaSessao: string
  meses: ConsultasNoMes[]
}

function pacienteDaConsulta(consulta: ConsultaFinanceira): PacienteAgenda | null {
  if (!consulta.patients) return null
  return Array.isArray(consulta.patients) ? consulta.patients[0] ?? null : consulta.patients
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return ''
  return `${dia}/${mes}/${ano}`
}

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split('-').map(Number)
  const texto = format(new Date(ano, mes - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function Financeiro() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recebimentos, setRecebimentos] = useState<RecebimentoParticular[]>([])
  const [busca, setBusca] = useState('')
  const [pacienteAberto, setPacienteAberto] = useState<string | null>(null)

  useEffect(() => {
    fetchRecebimentos()
  }, [])

  const fetchRecebimentos = async () => {
    try {
      setLoading(true)
      setError('')

      const consultas: ConsultaFinanceira[] = []
      const tamanhoPagina = 1000
      let inicio = 0

      while (true) {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            status,
            value,
            patient_type,
            patient_id,
            patients (
              id,
              nome,
              ativo
            )
          `)
          .order('date', { ascending: true })
          .range(inicio, inicio + tamanhoPagina - 1)

        if (error) throw error

        const pagina = (data || []) as ConsultaFinanceira[]
        consultas.push(...pagina)
        if (pagina.length < tamanhoPagina) break
        inicio += tamanhoPagina
      }

      const porPaciente = new Map<string, RecebimentoParticular>()

      for (const consulta of consultas) {
        if (consulta.patient_type === 'convenio') continue

        const paciente = pacienteDaConsulta(consulta)
        if (!paciente?.id || !paciente.nome) continue

        const atual = porPaciente.get(paciente.id) ?? {
          id: paciente.id,
          nome: paciente.nome,
          ativo: paciente.ativo !== false,
          sessoes: 0,
          valor: 0,
          ultimaSessao: '',
          meses: [],
        }

        const foiOuSeraAtendida = !consulta.status || consulta.status === 'scheduled' || consulta.status === 'completed'
        const dia = consulta.date?.slice(0, 10) || ''
        if (foiOuSeraAtendida && dia && dia > atual.ultimaSessao) atual.ultimaSessao = dia

        const mes = consulta.date?.slice(0, 7)
        if (mes) {
          const doMes = atual.meses.find((item) => item.chave === mes)
          if (doMes) doMes.quantidade += 1
          else atual.meses.push({ chave: mes, quantidade: 1 })
        }

        atual.sessoes += 1
        atual.valor += Number(consulta.value) || 0
        porPaciente.set(paciente.id, atual)
      }

      porPaciente.forEach((item) => {
        item.meses.sort((a, b) => a.chave.localeCompare(b.chave))
      })

      setRecebimentos(
        Array.from(porPaciente.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      )
    } catch (err) {
      console.error('Erro ao carregar financeiro:', err)
      setError('Não foi possível carregar os recebimentos dos pacientes particulares.')
    } finally {
      setLoading(false)
    }
  }

  const filtrados = recebimentos.filter((item) =>
    item.nome.toLowerCase().includes(busca.trim().toLowerCase())
  )
  const totalSessoes = filtrados.reduce((acc, item) => acc + item.sessoes, 0)
  const totalReceber = filtrados.reduce((acc, item) => acc + item.valor, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consultas particulares são pagas antecipadamente. As sessões vêm do número de repetições da Agenda e o valor recebido é a quantidade de sessões multiplicada pelo valor da consulta.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Pacientes particulares</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '...' : filtrados.length}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Sessões contratadas</p>
          <p className="mt-1 text-2xl font-bold text-[#0d8a7c]">{loading ? '...' : totalSessoes}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Valor recebido</p>
          <p className="mt-1 text-2xl font-bold text-[#5b4bd6]">{loading ? '...' : formatarMoeda(totalReceber)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="mb-6 max-w-sm relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar paciente..."
            className="pl-8"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Paciente</TableHead>
                <TableHead className="text-right font-semibold">Sessões contratadas</TableHead>
                <TableHead className="text-right font-semibold">Data da última sessão</TableHead>
                <TableHead className="text-right font-semibold">Valor recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    Carregando recebimentos...
                  </TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    Nenhum paciente particular com sessões na Agenda.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((item) => (
                  <Fragment key={item.id}>
                    <TableRow>
                      <TableCell className="font-medium text-gray-800">
                        <button
                          type="button"
                          className="text-left font-medium text-[#5b4bd6] underline-offset-2 hover:underline"
                          onClick={() => setPacienteAberto((atual) => atual === item.id ? null : item.id)}
                        >
                          {item.nome}
                        </button>
                        {!item.ativo && (
                          <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Inativo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.sessoes}</TableCell>
                      <TableCell className="text-right">{item.ultimaSessao ? formatarData(item.ultimaSessao) : '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatarMoeda(item.valor)}</TableCell>
                    </TableRow>
                    {pacienteAberto === item.id && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-gray-50">
                          <p className="mb-2 text-sm font-medium text-gray-700">Consultas por mês</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {item.meses.map((mes) => (
                              <div key={mes.chave} className="rounded-md border border-gray-200 bg-white px-3 py-2">
                                <p className="text-sm text-gray-500">{rotuloMes(mes.chave)}</p>
                                <p className="text-base font-semibold text-gray-900">
                                  {mes.quantidade} {mes.quantidade === 1 ? 'consulta' : 'consultas'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
