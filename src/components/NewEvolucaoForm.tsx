import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'

interface Patient {
  id: string
  nome: string
}

interface NewEvolucaoFormProps {
  isOpen: boolean
  onClose: () => void
}

function normalizarTexto(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function NewEvolucaoForm({ isOpen, onClose }: NewEvolucaoFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [listaAberta, setListaAberta] = useState(false)
  const [posicaoLista, setPosicaoLista] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 })
  const campoPacienteRef = useRef<HTMLInputElement>(null)
  const listaPacientesRef = useRef<HTMLUListElement>(null)
  const [formData, setFormData] = useState({
    patient_id: '',
    data: '',
    descricao: ''
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      
      if (error) throw error
      
      setPatients(data || [])
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, patient_id: value }))
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
    handleSelectChange(patient.id)
    setBuscaPaciente('')
    setListaAberta(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.patient_id || !formData.data || !formData.descricao) {
      setError('Por favor, preencha todos os campos obrigatórios')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Usuário não autenticado')
      
      const { error: insertError } = await supabase
        .from('evolucoes')
        .insert({
          patient_id: formData.patient_id,
          user_id: user.id,
          data: formData.data,
          descricao: formData.descricao
        })
      
      if (insertError) throw insertError
      
      onClose()
    } catch (err) {
      console.error('Erro ao adicionar evolução:', err)
      setError('Erro ao adicionar evolução')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
        <h2 className="text-lg font-semibold mb-4">Nova Evolução</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patient_id">Paciente *</Label>
            <Input
              ref={campoPacienteRef}
              id="patient_id"
              value={listaAberta ? buscaPaciente : (pacienteSelecionado?.nome ?? '')}
              onChange={(event) => {
                setBuscaPaciente(event.target.value)
                setListaAberta(true)
                if (formData.patient_id) handleSelectChange('')
              }}
              onFocus={() => {
                setBuscaPaciente('')
                setListaAberta(true)
              }}
              placeholder="Selecione um paciente"
              autoComplete="off"
              aria-expanded={listaAberta}
              aria-controls="lista-pacientes-evolucao"
              role="combobox"
            />
            {listaAberta && createPortal(
              <ul
                ref={listaPacientesRef}
                id="lista-pacientes-evolucao"
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
          
          <div>
            <Label htmlFor="data">Data *</Label>
            <Input 
              id="data" 
              name="data" 
              type="date" 
              value={formData.data} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div>
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea 
              id="descricao" 
              name="descricao" 
              value={formData.descricao} 
              onChange={handleChange} 
              required 
              rows={5}
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
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
    </div>
  )
} 