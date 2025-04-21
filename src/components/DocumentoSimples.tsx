import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { toast } from 'sonner'
import { Loader2, FileText, Save } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import html2pdf from 'html2pdf.js'

export function DocumentoSimples() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Form state
  const [selectedPatient, setSelectedPatient] = useState('')
  const [documentType, setDocumentType] = useState('atestado')
  const [customType, setCustomType] = useState('')
  const [content, setContent] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  
  // Fetch profile and patients on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      try {
        // Fetch profile
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (!profileError && profileData) {
            setProfile(profileData)
          }
          
          // Obter e-mail do objeto de autenticação
          setUserEmail(user.email || null)
        }
        
        // Fetch patients
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('*')
          .order('nome')
        
        if (!patientsError && patientsData) {
          setPatients(patientsData)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        toast.error('Erro ao carregar dados necessários')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user])
  
  // Get current patient
  const currentPatient = patients.find(p => p.id === selectedPatient)
  
  // Generate document title
  const getDocumentTitle = () => {
    if (documentType === 'outro' && customType) {
      return customType.toUpperCase()
    }
    
    const titles = {
      atestado: 'ATESTADO MÉDICO',
      encaminhamento: 'ENCAMINHAMENTO',
      exame: 'SOLICITAÇÃO DE EXAME'
    }
    
    return titles[documentType as keyof typeof titles] || 'DOCUMENTO'
  }
  
  // Generate document HTML
  const generateDocumentHtml = () => {
    const patientInfo = currentPatient ? 
      `<div class="mb-4">
        <p><strong>Paciente:</strong> ${currentPatient.nome}</p>
        <p><strong>CPF:</strong> ${currentPatient.cpf || 'Não informado'}</p>
        ${currentPatient.data_nascimento ? 
          `<p><strong>Data de Nascimento:</strong> ${format(
            new Date(currentPatient.data_nascimento), 
            'dd/MM/yyyy', 
            {locale: ptBR}
          )}</p>` : ''}
      </div>` : ''
    
    const formattedDate = format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', {locale: ptBR})
    
    // Informações de contato do profissional para o rodapé
    const contactInfo = `
      <div style="position: absolute; bottom: 30px; left: 50px; font-size: 12px; color: #555;">
        <p style="margin: 0;">📞 ${profile?.telefone || ''}</p>
        <p style="margin: 0;">✉️ ${userEmail || ''}</p>
      </div>
    `
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; position: relative; padding-bottom: 80px;">
        <!-- Papel Timbrado -->
        ${profile?.papel_timbrado_url ? 
          `<div style="width: 100%; margin-bottom: 30px;">
            <img src="${profile.papel_timbrado_url}" style="width: 100%; max-height: 150px; object-fit: contain;" />
          </div>` : 
          `<div style="text-align: center; margin-bottom: 30px;">
            <h2>${profile?.nome_completo || ''}</h2>
            <p>${profile?.especialidade || ''} - ${profile?.crm || ''}</p>
          </div>`
        }
        
        <!-- Título do documento -->
        <h1 style="text-align: center; margin-bottom: 20px; font-size: 18px; font-weight: bold;">
          ${getDocumentTitle()}
        </h1>
        
        <!-- Informações do paciente -->
        ${patientInfo}
        
        <!-- Conteúdo do documento -->
        <div style="margin: 30px 0; text-align: justify; min-height: 200px; line-height: 1.5;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        
        <!-- Data e assinatura -->
        <div style="margin-top: 30px; text-align: center;">
          <p>${formattedDate}</p>
        </div>
        
        <!-- Assinatura e informações do profissional centralizadas como um bloco único e compacto -->
        <div style="width: 100%; display: flex; justify-content: center; margin-top: 10px;">
          <div style="width: 300px; display: flex; flex-direction: column; align-items: center;">
            ${profile?.assinatura_url ?
              `<img src="${profile.assinatura_url}" style="display: block; margin: 0 auto 2px auto; max-width: 250px; height: auto; max-height: 70px;" />` : 
              '<div style="margin: 5px auto; border-top: 1px solid #000; width: 200px;"></div>'
            }
            <div style="text-align: center; width: 100%; margin-top: -5px;">
              <p style="margin: 0; font-size: 14px; line-height: 1.1;">
                ${profile?.nome_completo || ''}<br>
                ${profile?.especialidade || ''}<br>
                ${profile?.crm || ''}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Informações de contato -->
        ${profile?.telefone || userEmail ? contactInfo : ''}
      </div>
    `
  }
  
  // Generate and download PDF
  const handleGeneratePdf = async () => {
    if (!selectedPatient) {
      toast.error('Selecione um paciente')
      return
    }
    
    if (content.trim() === '') {
      toast.error('O conteúdo do documento não pode estar vazio')
      return
    }
    
    setGenerating(true)
    
    try {
      const documentHtml = generateDocumentHtml()
      const filename = `${getDocumentTitle().toLowerCase().replace(/\s+/g, '_')}_${currentPatient?.nome.split(' ')[0].toLowerCase()}_${format(new Date(), 'ddMMyyyy')}.pdf`
      
      // Usar html2pdf para gerar o PDF
      const element = document.createElement('div')
      element.innerHTML = documentHtml
      document.body.appendChild(element)
      
      const options = {
        margin: [15, 15, 15, 15],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      
      await html2pdf().set(options).from(element).save()
      document.body.removeChild(element)
      
      // Salvar no histórico (opcional)
      await supabase.from('document_history').insert({
        template_id: null, // Não usa template, é documento simples
        user_id: user?.id,
        patient_id: selectedPatient,
        title: getDocumentTitle(),
        content: documentHtml,
        field_values: { content }
      })
      
      toast.success('Documento gerado com sucesso!')
      
      // Limpar formulário após geração bem-sucedida
      setSelectedPatient('')
      setDocumentType('atestado')
      setCustomType('')
      setContent('')
      setIsPreview(false)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar documento')
    } finally {
      setGenerating(false)
    }
  }
  
  // Preview component
  if (isPreview) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setIsPreview(false)}>
            Voltar para Edição
          </Button>
          <Button 
            onClick={handleGeneratePdf} 
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Gerar PDF
              </>
            )}
          </Button>
        </div>
        
        <div className="border rounded-lg p-6 bg-white overflow-auto max-h-[70vh]">
          <div dangerouslySetInnerHTML={{ __html: generateDocumentHtml() }} />
        </div>
      </div>
    )
  }
  
  // Form component
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Criar Documento</h2>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <Label htmlFor="patient">Paciente</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger id="patient">
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
          
          <div>
            <Label htmlFor="document-type">Tipo de Documento</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atestado">Atestado Médico</SelectItem>
                <SelectItem value="encaminhamento">Encaminhamento</SelectItem>
                <SelectItem value="exame">Solicitação de Exame</SelectItem>
                <SelectItem value="outro">Outro (especificar)</SelectItem>
              </SelectContent>
            </Select>
            
            {documentType === 'outro' && (
              <Input
                className="mt-2"
                placeholder="Especifique o tipo de documento"
                value={customType}
                onChange={e => setCustomType(e.target.value)}
              />
            )}
          </div>
          
          <div>
            <Label htmlFor="content">Conteúdo do Documento</Label>
            <Textarea
              id="content"
              placeholder="Digite o conteúdo do documento aqui..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => setIsPreview(true)}
            disabled={!selectedPatient || content.trim() === ''}
          >
            <FileText className="mr-2 h-4 w-4" />
            Pré-visualizar Documento
          </Button>
        </div>
      )}
    </div>
  )
} 