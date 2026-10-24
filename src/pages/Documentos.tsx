import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { documentService } from "@/services/documentService"
import { DocumentTemplate } from "@/types/documents"
import { Loader2, Plus, FileText, Settings, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DocumentForm } from "@/components/DocumentForm"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export default function Documentos() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<DocumentTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("criar")
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [documentFormOpen, setDocumentFormOpen] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const templates = await documentService.getTemplates()
      setTemplates(templates)
      setFilteredTemplates(templates)
    } catch (err) {
      console.error('Erro ao buscar modelos:', err)
      setError('Falha ao carregar modelos de documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTemplates(templates)
    } else {
      const filtered = templates.filter(template => 
        template.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredTemplates(filtered)
    }
  }, [searchTerm, templates])

  const openDocumentForm = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setDocumentFormOpen(true)
  }

  const handleDocumentCreated = () => {
    // Atualizar para mostrar a aba de histórico
    setActiveTab("historico")
    // TODO: Buscar o histórico de documentos atualizado
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Documentos</h1>
      
      <Tabs defaultValue="criar" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="criar" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Criar Documento</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="modelos" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Gerenciar Modelos</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="criar">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Criar Novo Documento</h2>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Buscar modelos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : error ? (
              <div className="bg-red-50 rounded-lg p-6">
                <p className="text-red-500 text-center">{error}</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-500 text-center">Nenhum modelo encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <div 
                    key={template.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openDocumentForm(template)}
                  >
                    <div className="flex items-center mb-2">
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      <h3 className="font-medium">{template.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 capitalize">
                      Tipo: {template.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {template.is_system ? 'Modelo do sistema' : 'Modelo personalizado'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="historico">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Histórico de Documentos</h2>
            <p className="text-gray-500 text-center">Funcionalidade em implementação</p>
          </div>
        </TabsContent>
        
        <TabsContent value="modelos">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Gerenciar Modelos</h2>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                <span>Novo Modelo</span>
              </Button>
            </div>
            
            <p className="text-gray-500 text-center">Funcionalidade em implementação</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para o formulário de documento */}
      <Dialog open={documentFormOpen} onOpenChange={setDocumentFormOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-auto">
            {selectedTemplate && (
              <DocumentForm 
                template={selectedTemplate} 
                onClose={() => setDocumentFormOpen(false)}
                onSuccess={handleDocumentCreated}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 