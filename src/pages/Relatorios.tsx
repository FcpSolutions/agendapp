import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Edit, Trash2, FileText, Upload } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { NewTemplateForm } from '@/components/NewTemplateForm'

interface Template {
  id: string
  nome: string
  conteudo: string
  tipo: 'texto' | 'arquivo'
  arquivo_url?: string
  created_at: string
}

interface Patient {
  id: string
  nome: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
  endereco: string
}

export default function Relatorios() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false)
  const [isImportTemplateOpen, setIsImportTemplateOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [processedContent, setProcessedContent] = useState<string>('')

  useEffect(() => {
    fetchTemplates()
    fetchPatients()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTemplates(templates)
    } else {
      const filtered = templates.filter(template => 
        template.nome.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTemplates(filtered)
    }
  }, [searchTerm, templates])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('nome')

      if (error) throw error

      setPatients(data || [])
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTemplates(data || [])
      setFilteredTemplates(data || [])
    } catch (err) {
      console.error('Erro ao buscar templates:', err)
      setError('Não foi possível carregar os templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchTemplates()
    } catch (err) {
      console.error('Erro ao excluir template:', err)
      setError('Não foi possível excluir o template')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template)
    setSelectedPatientId('')
    setProcessedContent('')
    setIsPreviewOpen(true)
  }

  const processTemplate = async () => {
    if (!selectedTemplate || !selectedPatientId) return

    try {
      // Buscar dados do paciente
      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', selectedPatientId)
        .single()

      if (error) throw error

      // Processar o conteúdo substituindo as variáveis
      let content = selectedTemplate.conteudo

      // Substituir variáveis do paciente
      content = content.replace(/{{paciente\.nome}}/g, patient.nome || '')
      content = content.replace(/{{paciente\.email}}/g, patient.email || '')
      content = content.replace(/{{paciente\.telefone}}/g, patient.telefone || '')
      content = content.replace(/{{paciente\.cpf}}/g, patient.cpf || '')
      content = content.replace(/{{paciente\.data_nascimento}}/g, patient.data_nascimento || '')
      content = content.replace(/{{paciente\.endereco}}/g, patient.endereco || '')

      // Substituir variáveis do sistema
      const dataAtual = new Date().toLocaleDateString('pt-BR')
      const horaAtual = new Date().toLocaleTimeString('pt-BR')
      content = content.replace(/{{data_atual}}/g, dataAtual)
      content = content.replace(/{{hora_atual}}/g, horaAtual)

      setProcessedContent(content)
    } catch (err) {
      console.error('Erro ao processar template:', err)
      setError('Erro ao processar template')
    }
  }

  useEffect(() => {
    if (selectedPatientId) {
      processTemplate()
    }
  }, [selectedPatientId])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsImportTemplateOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-5 w-5" />
            Importar Template
          </Button>
          <Button 
            onClick={() => setIsNewTemplateOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Novo Template
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">Data de Criação</TableHead>
                <TableHead className="text-right font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    Nenhum template encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-gray-50">
                    <TableCell>{template.nome}</TableCell>
                    <TableCell>
                      {template.tipo === 'texto' ? 'Texto' : 'Arquivo'}
                    </TableCell>
                    <TableCell>
                      {new Date(template.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(template)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(template)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Visualização do Template */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedTemplate?.tipo === 'texto' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paciente">Selecione o Paciente</Label>
                  <Select
                    value={selectedPatientId}
                    onValueChange={setSelectedPatientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="prose max-w-none border rounded-lg p-4 bg-gray-50">
                  {selectedPatientId ? (
                    <div dangerouslySetInnerHTML={{ __html: processedContent }} />
                  ) : (
                    <div className="text-gray-500 text-center py-4">
                      Selecione um paciente para visualizar o relatório
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTemplate?.tipo === 'arquivo' && (
              <div className="flex justify-center">
                <iframe
                  src={selectedTemplate?.arquivo_url}
                  className="w-full h-[600px]"
                  title={selectedTemplate?.nome}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Template */}
      <NewTemplateForm
        isOpen={isNewTemplateOpen}
        onClose={() => setIsNewTemplateOpen(false)}
        onSuccess={() => {
          setIsNewTemplateOpen(false)
          fetchTemplates()
        }}
      />

      {/* Modal de Importar Template */}
      <Dialog open={isImportTemplateOpen} onOpenChange={setIsImportTemplateOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white">
          <DialogHeader>
            <DialogTitle>Importar Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="arquivo">Arquivo</Label>
              <Input
                id="arquivo"
                type="file"
                accept=".pdf,.doc,.docx"
              />
              <p className="text-sm text-gray-500 mt-1">
                Formatos aceitos: PDF, DOC, DOCX
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportTemplateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 