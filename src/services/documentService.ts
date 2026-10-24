import { supabase } from '@/lib/supabase';
import { DocumentTemplate, DocumentHistory, FieldValues } from '@/types/documents';

function sanitizarHtml(html: string) {
  if (typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, iframe, object, embed, link, meta, base').forEach((el) => el.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const nome = attr.name.toLowerCase()
      const valor = attr.value.replace(/\s/g, '').toLowerCase()
      if (nome.startsWith('on') || valor.includes('javascript:') || valor.startsWith('data:text/html')) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Serviço para gerenciar modelos de relatórios e histórico
 */
export const relatorioService = {
  /**
   * Busca todos os modelos de relatórios disponíveis para o usuário
   */
  async getTemplates(): Promise<DocumentTemplate[]> {
    const { data: userTemplates, error: userError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    const { data: systemTemplates, error: systemError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('is_system', true);

    if (userError || systemError) {
      console.error('Erro ao buscar modelos:', userError || systemError);
      throw new Error('Falha ao carregar modelos de relatórios');
    }

    return [...(systemTemplates || []), ...(userTemplates || [])];
  },

  /**
   * Busca um modelo de relatório específico por ID
   */
  async getTemplateById(id: string): Promise<DocumentTemplate | null> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar modelo:', error);
      throw new Error('Falha ao carregar modelo de relatório');
    }

    return data;
  },

  /**
   * Cria um novo modelo de relatório
   */
  async createTemplate(template: Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentTemplate> {
    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        ...template,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar modelo:', error);
      throw new Error('Falha ao criar modelo de relatório');
    }

    return data;
  },

  /**
   * Atualiza um modelo de relatório existente
   */
  async updateTemplate(id: string, template: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const { data, error } = await supabase
      .from('document_templates')
      .update({
        ...template,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar modelo:', error);
      throw new Error('Falha ao atualizar modelo de relatório');
    }

    return data;
  },

  /**
   * Exclui um modelo de relatório
   */
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir modelo:', error);
      throw new Error('Falha ao excluir modelo de relatório');
    }
  },

  /**
   * Salva um relatório no histórico
   */
  async saveDocument(document: Omit<DocumentHistory, 'id' | 'created_at'>): Promise<DocumentHistory> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) {
      throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
      .from('document_history')
      .insert({
        ...document,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar relatório:', error);
      throw new Error('Falha ao salvar relatório');
    }

    return data;
  },

  /**
   * Busca o histórico de relatórios de um paciente
   */
  async getDocumentHistory(patientId: string): Promise<DocumentHistory[]> {
    const { data, error } = await supabase
      .from('document_history')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      throw new Error('Falha ao carregar histórico de relatórios');
    }

    return data || [];
  },

  /**
   * Busca um relatório específico do histórico
   */
  async getDocumentById(id: string): Promise<DocumentHistory | null> {
    const { data, error } = await supabase
      .from('document_history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar relatório:', error);
      throw new Error('Falha ao carregar relatório');
    }

    return data;
  },

  /**
   * Gera o HTML final de um relatório com os valores preenchidos
   */
  generateDocumentHtml(templateHtml: string, fieldValues: FieldValues): string {
    let html = templateHtml;
    
    Object.entries(fieldValues).forEach(([key, value]) => {
      const chave = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const texto = escaparHtml(String(value ?? '')).replace(/\n/g, '<br>')
      html = html.replace(new RegExp(`{{${chave}}}`, 'g'), texto)
    });
    
    return sanitizarHtml(html);
  },
  
  /**
   * Renderiza um documento com dados dinâmicos
   */
  async renderDocument(documentData: any): Promise<string> {
    try {
      // Obter o template
      const template = await this.getTemplateById(documentData.template_id);
      
      if (!template) {
        throw new Error('Modelo de relatório não encontrado');
      }
      
      // Preparar os valores para substituição no template
      const fieldValues: FieldValues = {
        ...documentData.fields
      };
      
      // Gerar o HTML do documento com os valores substituídos
      const html = this.generateDocumentHtml(template.html_template, fieldValues);
      
      return html;
    } catch (error) {
      console.error('Erro ao renderizar documento:', error);
      throw new Error('Falha ao renderizar o relatório');
    }
  },
  
  /**
   * Gera um PDF a partir do HTML do documento
   */
  async generatePDF(html: string, filename: string): Promise<void> {
    try {
      // Implementação simulada - em uma aplicação real, você usaria
      // uma biblioteca como jsPDF, html2pdf ou uma API de servidor
      console.log('Gerando PDF para:', filename);
      
      // Criando um link de download com o HTML como Blob
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Falha ao gerar PDF do relatório');
    }
  }
};

// Exportando também como documentService para manter compatibilidade
export const documentService = relatorioService; 