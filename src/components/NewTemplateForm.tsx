import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NewTemplateFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewTemplateForm({ isOpen, onClose, onSuccess }: NewTemplateFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tipo, setTipo] = useState<'texto' | 'arquivo'>('texto')
  const [nome, setNome] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      let arquivo_url = null

      if (tipo === 'arquivo' && arquivo) {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('templates')
          .upload(fileName, arquivo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('templates')
          .getPublicUrl(fileName)

        arquivo_url = publicUrl
      }

      const { error } = await supabase
        .from('templates')
        .insert({
          nome,
          tipo,
          conteudo: tipo === 'texto' ? conteudo : null,
          arquivo_url,
          user_id: user.id
        })

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao criar template:', err)
      setError('Erro ao criar template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Campos Disponíveis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-1">Paciente</h4>
                <ul className="text-sm space-y-1">
                  <li><code>{"{{paciente.nome}}"}</code> - Nome do paciente</li>
                  <li><code>{"{{paciente.email}}"}</code> - E-mail do paciente</li>
                  <li><code>{"{{paciente.telefone}}"}</code> - Telefone do paciente</li>
                  <li><code>{"{{paciente.cpf}}"}</code> - CPF do paciente</li>
                  <li><code>{"{{paciente.data_nascimento}}"}</code> - Data de nascimento</li>
                  <li><code>{"{{paciente.endereco}}"}</code> - Endereço completo</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-1">Consulta</h4>
                <ul className="text-sm space-y-1">
                  <li><code>{"{{consulta.data}}"}</code> - Data da consulta</li>
                  <li><code>{"{{consulta.duracao}}"}</code> - Duração da consulta</li>
                  <li><code>{"{{consulta.status}}"}</code> - Status da consulta</li>
                  <li><code>{"{{consulta.observacoes}}"}</code> - Observações</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-1">Ficha Clínica</h4>
                <ul className="text-sm space-y-1">
                  <li><code>{"{{ficha.data_consulta}}"}</code> - Data da consulta</li>
                  <li><code>{"{{ficha.queixa_principal}}"}</code> - Queixa principal</li>
                  <li><code>{"{{ficha.diagnostico}}"}</code> - Diagnóstico</li>
                  <li><code>{"{{ficha.conduta}}"}</code> - Conduta</li>
                  <li><code>{"{{ficha.observacoes}}"}</code> - Observações</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-1">Receita Financeira</h4>
                <ul className="text-sm space-y-1">
                  <li><code>{"{{receita.data}}"}</code> - Data do pagamento</li>
                  <li><code>{"{{receita.tipo_pagamento}}"}</code> - Tipo (particular/convênio)</li>
                  <li><code>{"{{receita.operadora}}"}</code> - Operadora do convênio</li>
                  <li><code>{"{{receita.plano_saude}}"}</code> - Plano de saúde</li>
                  <li><code>{"{{receita.valor}}"}</code> - Valor</li>
                  <li><code>{"{{receita.observacoes}}"}</code> - Observações</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-1">Profissional</h4>
                <ul className="text-sm space-y-1">
                  <li><code>{"{{profissional.nome_completo}}"}</code> - Nome completo</li>
                  <li><code>{"{{profissional.crm}}"}</code> - CRM</li>
                  <li><code>{"{{profissional.telefone}}"}</code> - Telefone</li>
                  <li><code>{"{{profissional.email}}"}</code> - E-mail</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-1">Sistema</h4>
                <ul className="text-sm space-y-1">
                  <li><code>{"{{data_atual}}"}</code> - Data atual</li>
                  <li><code>{"{{hora_atual}}"}</code> - Hora atual</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Template</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(value: 'texto' | 'arquivo') => setTipo(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="arquivo">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipo === 'texto' && (
              <div className="space-y-2">
                <Label htmlFor="conteudo">Conteúdo</Label>
                <Textarea
                  id="conteudo"
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Digite o conteúdo do template aqui..."
                />
              </div>
            )}

            {tipo === 'arquivo' && (
              <div className="space-y-2">
                <Label htmlFor="arquivo">Arquivo</Label>
                <Input
                  id="arquivo"
                  type="file"
                  onChange={handleFileChange}
                  accept=".doc,.docx,.pdf"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 