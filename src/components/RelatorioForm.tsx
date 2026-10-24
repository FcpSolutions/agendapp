import { useState, useEffect } from 'react'
import { DocumentTemplate, FieldValues, DocumentField } from '@/types/documents'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { relatorioService } from '@/services/documentService'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, FileText, ArrowLeft, Download, Save } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface RelatorioFormProps {
  template: DocumentTemplate
  onClose: () => void
  onSuccess?: (documentId: string) => void
}

export function RelatorioForm({ template, onClose, onSuccess }: RelatorioFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patients, setPatients] = useState<{ id: string; nome: string }[]>([])
  const [currentStep, setCurrentStep] = useState<'form' | 'preview'>('form')
  const [generatedDocument, setGeneratedDocument] = useState<string>('')
  
  const [fieldValues, setFieldValues] = useState<FieldValues>({})
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const { user } = useAuth()

  // Inicializar valores dos campos com os valores padrão do template
  useEffect(() => {
    const defaultValues: FieldValues = {}
    
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.id] = field.defaultValue
      } else if (field.type === 'date' && field.id === 'data_atual') {
        // Preencher a data atual para campos com ID 'data_atual'
        defaultValues[field.id] = format(new Date(), 'yyyy-MM-dd')
      }
    })
    
    setFieldValues(defaultValues)
  }, [template])

  // Buscar pacientes
  useEffect(() => {
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
        setError('Falha ao carregar lista de pacientes')
      }
    }
    
    fetchPatients()
  }, [])

  // Buscar dados do profissional logado
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        if (!user) return
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        
        if (data) {
          // Preencher campos relacionados ao profissional
          const profileData: FieldValues = {}
          
          if (data.nome_completo && template.fields.some(f => f.id === 'nome_medico')) {
            profileData['nome_medico'] = data.nome_completo
          }
          
          if (data.crm && template.fields.some(f => f.id === 'crm')) {
            profileData['crm'] = data.crm
          }
          
          setFieldValues(prev => ({ ...prev, ...profileData }))
        }
      } catch (err) {
        console.error('Erro ao buscar dados do perfil:', err)
      }
    }
    
    fetchProfileData()
  }, [template, user])

  const handleInputChange = (fieldId: string, value: string | number | boolean) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatient(patientId)
    
    // Encontrar o paciente selecionado
    const patient = patients.find(p => p.id === patientId)
    
    if (patient && template.fields.some(f => f.id === 'nome_paciente')) {
      handleInputChange('nome_paciente', patient.nome)
    }
  }

  const handlePreview = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Verificar campos obrigatórios
      const missingFields = template.fields
        .filter(field => field.required && !fieldValues[field.id])
        .map(field => field.label)
      
      if (missingFields.length > 0) {
        setError(`Preencha os seguintes campos obrigatórios: ${missingFields.join(', ')}`)
        return
      }
      
      if (!selectedPatient) {
        setError('Selecione um paciente')
        return
      }
      
      // Preparar os dados para renderização do documento
      const documentData = {
        template_id: template.id,
        fields: fieldValues
      }
      
      // Gerar o documento pré-visualizado usando o serviço
      const renderedDocument = await relatorioService.renderDocument(documentData)
      setGeneratedDocument(renderedDocument)
      setCurrentStep('preview')
    } catch (err) {
      console.error('Erro ao gerar pré-visualização:', err)
      setError('Falha ao gerar pré-visualização do relatório')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedPatient) {
      setError('Selecione um paciente')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // A propriedade user_id será adicionada automaticamente pelo serviço
      // usando o usuário autenticado atual
      const documentData = {
        template_id: template.id,
        patient_id: selectedPatient,
        title: template.title,
        content: generatedDocument,
        field_values: fieldValues,
        user_id: '' // Este valor será substituído pelo serviço
      }
      
      const savedDocument = await relatorioService.saveDocument(documentData)
      
      if (onSuccess) {
        onSuccess(savedDocument.id)
      }
      
      onClose()
    } catch (err) {
      console.error('Erro ao salvar relatório:', err)
      setError('Falha ao salvar relatório')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDownloadPDF = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (generatedDocument) {
        await relatorioService.generatePDF(generatedDocument, `${template.title}.pdf`)
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setError('Falha ao gerar PDF')
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field: DocumentField) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.id}
            value={fieldValues[field.id] as string || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full"
          />
        )
      
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            value={fieldValues[field.id] as string || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full min-h-[100px]"
          />
        )
      
      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            value={fieldValues[field.id] as number || ''}
            onChange={(e) => handleInputChange(field.id, Number(e.target.value))}
            className="w-full"
          />
        )
      
      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            value={fieldValues[field.id] as string || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full"
          />
        )
      
      case 'select':
        return (
          <Select
            value={fieldValues[field.id] as string || ''}
            onValueChange={(value) => handleInputChange(field.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'checkbox':
        return (
          <Checkbox
            id={field.id}
            checked={fieldValues[field.id] as boolean || false}
            onCheckedChange={(checked: boolean | 'indeterminate') => 
              handleInputChange(field.id, checked === 'indeterminate' ? false : checked)
            }
          />
        )
      
      default:
        return null
    }
  }

  if (currentStep === 'preview') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setCurrentStep('form')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Voltar ao formulário</span>
          </button>
          
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Cancelar
            </Button>
            <Button 
              onClick={handleDownloadPDF} 
              variant="outline"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar PDF
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Relatório
                </>
              )}
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <p className="text-red-500">{error}</p>
          </div>
        )}
        
        <div className="flex-1 overflow-auto bg-white rounded-md shadow p-6">
          <div 
            className="document-preview"
            dangerouslySetInnerHTML={{ __html: generatedDocument }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{template.title}</h2>
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button onClick={handlePreview}>
            <FileText className="h-4 w-4 mr-2" />
            Visualizar
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      <div className="space-y-6 flex-1 overflow-auto">
        <div className="border-b border-gray-200 pb-4">
          <Label htmlFor="patient">Paciente</Label>
          <Select
            value={selectedPatient}
            onValueChange={handlePatientSelect}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {template.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 