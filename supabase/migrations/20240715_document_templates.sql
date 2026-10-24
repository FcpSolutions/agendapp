-- Criar tabela para modelos de documentos
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('atestado', 'exame', 'encaminhamento', 'outro')),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  file_path TEXT,
  html_template TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para histórico de documentos gerados
CREATE TABLE IF NOT EXISTS public.document_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comentários nas tabelas e colunas
COMMENT ON TABLE public.document_templates IS 'Modelos de documentos para relatórios e formulários';
COMMENT ON COLUMN public.document_templates.id IS 'ID do modelo de documento';
COMMENT ON COLUMN public.document_templates.user_id IS 'ID do usuário que criou o modelo (NULL para modelos do sistema)';
COMMENT ON COLUMN public.document_templates.title IS 'Título do modelo';
COMMENT ON COLUMN public.document_templates.type IS 'Tipo do documento (atestado, exame, encaminhamento, outro)';
COMMENT ON COLUMN public.document_templates.is_system IS 'Indica se é um modelo do sistema ou personalizado pelo usuário';
COMMENT ON COLUMN public.document_templates.file_path IS 'Caminho do arquivo Word original (se houver)';
COMMENT ON COLUMN public.document_templates.html_template IS 'Conteúdo HTML do modelo com placeholders';
COMMENT ON COLUMN public.document_templates.fields IS 'Lista de campos para preencher no modelo (JSON)';
COMMENT ON COLUMN public.document_templates.created_at IS 'Data de criação do modelo';
COMMENT ON COLUMN public.document_templates.updated_at IS 'Data da última atualização do modelo';

COMMENT ON TABLE public.document_history IS 'Histórico de documentos gerados para pacientes';
COMMENT ON COLUMN public.document_history.id IS 'ID do documento gerado';
COMMENT ON COLUMN public.document_history.template_id IS 'ID do modelo usado';
COMMENT ON COLUMN public.document_history.user_id IS 'ID do usuário que gerou o documento';
COMMENT ON COLUMN public.document_history.patient_id IS 'ID do paciente para quem o documento foi gerado';
COMMENT ON COLUMN public.document_history.title IS 'Título do documento';
COMMENT ON COLUMN public.document_history.content IS 'Conteúdo HTML do documento gerado';
COMMENT ON COLUMN public.document_history.field_values IS 'Valores dos campos preenchidos (JSON)';
COMMENT ON COLUMN public.document_history.created_at IS 'Data de criação do documento';

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_document_templates_user_id ON public.document_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates(type);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_system ON public.document_templates(is_system);

CREATE INDEX IF NOT EXISTS idx_document_history_template_id ON public.document_history(template_id);
CREATE INDEX IF NOT EXISTS idx_document_history_user_id ON public.document_history(user_id);
CREATE INDEX IF NOT EXISTS idx_document_history_patient_id ON public.document_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_document_history_created_at ON public.document_history(created_at);

-- Permitir que usuários autenticados acessem os modelos do sistema
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_templates_select_policy ON public.document_templates
  FOR SELECT USING (
    is_system = TRUE OR
    user_id = auth.uid()
  );

-- Permitir que usuários autenticados alterem apenas seus próprios modelos
CREATE POLICY document_templates_insert_policy ON public.document_templates
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY document_templates_update_policy ON public.document_templates
  FOR UPDATE USING (
    user_id = auth.uid()
  );

CREATE POLICY document_templates_delete_policy ON public.document_templates
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Políticas de segurança para o histórico de documentos
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_history_select_policy ON public.document_history
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY document_history_insert_policy ON public.document_history
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Criar trigger para atualizar o updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Inserir modelos padrão
INSERT INTO public.document_templates (title, type, is_system, html_template, fields)
VALUES
  (
    'Atestado Médico',
    'atestado',
    TRUE,
    '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 30px;">ATESTADO MÉDICO</h1>
      <p style="text-align: justify; line-height: 1.5;">
        Atesto para os devidos fins que o(a) paciente <strong>{{nome_paciente}}</strong>, 
        esteve sob meus cuidados médicos no dia {{data_atendimento}}, necessitando de 
        afastamento de suas atividades por {{dias_afastamento}} dia(s) a partir desta data.
      </p>
      <p style="text-align: justify; margin-top: 20px; line-height: 1.5;">
        {{observacoes}}
      </p>
      <div style="margin-top: 50px; text-align: center;">
        <p>{{cidade}}, {{data_atual}}</p>
        <div style="margin-top: 50px; border-top: 1px solid #000; width: 250px; margin: 50px auto 0;">
          <p>{{nome_medico}}<br>CRM: {{crm}}</p>
        </div>
      </div>
    </div>',
    '[
      {"id": "nome_paciente", "label": "Nome do Paciente", "type": "text", "required": true},
      {"id": "data_atendimento", "label": "Data do Atendimento", "type": "date", "required": true},
      {"id": "dias_afastamento", "label": "Dias de Afastamento", "type": "number", "required": true},
      {"id": "observacoes", "label": "Observações", "type": "textarea", "required": false},
      {"id": "cidade", "label": "Cidade", "type": "text", "required": true},
      {"id": "data_atual", "label": "Data Atual", "type": "date", "required": true},
      {"id": "nome_medico", "label": "Nome do Médico", "type": "text", "required": true},
      {"id": "crm", "label": "CRM", "type": "text", "required": true}
    ]'
  ),
  (
    'Solicitação de Exame',
    'exame',
    TRUE,
    '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 30px;">SOLICITAÇÃO DE EXAME</h1>
      <div style="margin-bottom: 20px;">
        <p><strong>Paciente:</strong> {{nome_paciente}}</p>
        <p><strong>Data da Solicitação:</strong> {{data_solicitacao}}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h2>Exames Solicitados:</h2>
        <p>{{exames_solicitados}}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h2>Informações Clínicas:</h2>
        <p>{{informacoes_clinicas}}</p>
      </div>
      <div style="margin-top: 50px; text-align: center;">
        <p>{{cidade}}, {{data_atual}}</p>
        <div style="margin-top: 50px; border-top: 1px solid #000; width: 250px; margin: 50px auto 0;">
          <p>{{nome_medico}}<br>CRM: {{crm}}</p>
        </div>
      </div>
    </div>',
    '[
      {"id": "nome_paciente", "label": "Nome do Paciente", "type": "text", "required": true},
      {"id": "data_solicitacao", "label": "Data da Solicitação", "type": "date", "required": true},
      {"id": "exames_solicitados", "label": "Exames Solicitados", "type": "textarea", "required": true},
      {"id": "informacoes_clinicas", "label": "Informações Clínicas", "type": "textarea", "required": false},
      {"id": "cidade", "label": "Cidade", "type": "text", "required": true},
      {"id": "data_atual", "label": "Data Atual", "type": "date", "required": true},
      {"id": "nome_medico", "label": "Nome do Médico", "type": "text", "required": true},
      {"id": "crm", "label": "CRM", "type": "text", "required": true}
    ]'
  ),
  (
    'Encaminhamento',
    'encaminhamento',
    TRUE,
    '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="text-align: center; margin-bottom: 30px;">ENCAMINHAMENTO</h1>
      <div style="margin-bottom: 20px;">
        <p><strong>Paciente:</strong> {{nome_paciente}}</p>
        <p><strong>Data do Encaminhamento:</strong> {{data_encaminhamento}}</p>
        <p><strong>Especialidade:</strong> {{especialidade}}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h2>Motivo do Encaminhamento:</h2>
        <p>{{motivo_encaminhamento}}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h2>Observações:</h2>
        <p>{{observacoes}}</p>
      </div>
      <div style="margin-top: 50px; text-align: center;">
        <p>{{cidade}}, {{data_atual}}</p>
        <div style="margin-top: 50px; border-top: 1px solid #000; width: 250px; margin: 50px auto 0;">
          <p>{{nome_medico}}<br>CRM: {{crm}}</p>
        </div>
      </div>
    </div>',
    '[
      {"id": "nome_paciente", "label": "Nome do Paciente", "type": "text", "required": true},
      {"id": "data_encaminhamento", "label": "Data do Encaminhamento", "type": "date", "required": true},
      {"id": "especialidade", "label": "Especialidade", "type": "text", "required": true},
      {"id": "motivo_encaminhamento", "label": "Motivo do Encaminhamento", "type": "textarea", "required": true},
      {"id": "observacoes", "label": "Observações", "type": "textarea", "required": false},
      {"id": "cidade", "label": "Cidade", "type": "text", "required": true},
      {"id": "data_atual", "label": "Data Atual", "type": "date", "required": true},
      {"id": "nome_medico", "label": "Nome do Médico", "type": "text", "required": true},
      {"id": "crm", "label": "CRM", "type": "text", "required": true}
    ]'
  ); 