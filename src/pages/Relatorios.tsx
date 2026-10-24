import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocumentTemplate } from "@/types/documents"
import { Clock, FileSignature } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { RelatorioForm } from "@/components/RelatorioForm"
import { DocumentoSimples } from "@/components/DocumentoSimples"

export default function Relatorios() {
  const [activeTab, setActiveTab] = useState("simples")
  const [selectedTemplate] = useState<DocumentTemplate | null>(null)
  const [documentFormOpen, setDocumentFormOpen] = useState(false)

  const handleDocumentCreated = () => {
    // Atualizar para mostrar a aba de histórico
    setActiveTab("historico")
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Relatórios</h1>
      
      <Tabs defaultValue="simples" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="simples" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            <span>Documento Simples</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Histórico</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="simples">
          <div className="bg-white rounded-lg shadow p-6">
            <DocumentoSimples />
          </div>
        </TabsContent>
        
        <TabsContent value="historico">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Histórico de Relatórios</h2>
            <p className="text-gray-500 text-center">Funcionalidade em implementação</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog para o formulário de relatório */}
      <Dialog open={documentFormOpen} onOpenChange={setDocumentFormOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-auto">
            {selectedTemplate && (
              <RelatorioForm 
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