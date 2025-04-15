-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se a tabela existe e removê-la se necessário
DROP TABLE IF EXISTS public.receitas CASCADE;

-- Criar a tabela receitas
CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo_pagamento TEXT NOT NULL CHECK (tipo_pagamento IN ('particular', 'convenio')),
  operadora TEXT,
  plano_saude TEXT,
  valor DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários
COMMENT ON TABLE public.receitas IS 'Tabela para armazenar receitas médicas';
COMMENT ON COLUMN public.receitas.id IS 'Identificador único da receita';
COMMENT ON COLUMN public.receitas.patient_id IS 'ID do paciente';
COMMENT ON COLUMN public.receitas.user_id IS 'ID do usuário que criou a receita';
COMMENT ON COLUMN public.receitas.data IS 'Data da receita';
COMMENT ON COLUMN public.receitas.tipo_pagamento IS 'Tipo de pagamento (particular ou convênio)';
COMMENT ON COLUMN public.receitas.operadora IS 'Nome da operadora de convênio';
COMMENT ON COLUMN public.receitas.plano_saude IS 'Nome do plano de saúde';
COMMENT ON COLUMN public.receitas.valor IS 'Valor da receita';
COMMENT ON COLUMN public.receitas.observacoes IS 'Observações adicionais';
COMMENT ON COLUMN public.receitas.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.receitas.updated_at IS 'Data de atualização do registro';

-- Criar índices para otimização
CREATE INDEX idx_receitas_patient_id ON public.receitas(patient_id);
CREATE INDEX idx_receitas_user_id ON public.receitas(user_id);
CREATE INDEX idx_receitas_data ON public.receitas(data);
CREATE INDEX idx_receitas_tipo_pagamento ON public.receitas(tipo_pagamento);
CREATE INDEX idx_receitas_operadora ON public.receitas(operadora);
CREATE INDEX idx_receitas_plano_saude ON public.receitas(plano_saude);
CREATE INDEX idx_receitas_valor ON public.receitas(valor);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias receitas" 
  ON public.receitas 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias receitas" 
  ON public.receitas 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias receitas" 
  ON public.receitas 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias receitas" 
  ON public.receitas 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Criar trigger para atualizar o campo updated_at
CREATE TRIGGER set_receitas_updated_at
BEFORE UPDATE ON public.receitas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at(); 