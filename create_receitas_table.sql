-- Criar a função set_updated_at se ela não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar a tabela de receitas
CREATE TABLE IF NOT EXISTS public.receitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    tipo_pagamento TEXT NOT NULL CHECK (tipo_pagamento IN ('particular', 'convenio')),
    operadora TEXT,
    plano_saude TEXT,
    valor DECIMAL(10,2) NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários na tabela e colunas
COMMENT ON TABLE public.receitas IS 'Tabela de receitas financeiras';
COMMENT ON COLUMN public.receitas.id IS 'Identificador único da receita';
COMMENT ON COLUMN public.receitas.patient_id IS 'ID do paciente';
COMMENT ON COLUMN public.receitas.user_id IS 'ID do usuário que criou a receita';
COMMENT ON COLUMN public.receitas.data IS 'Data do pagamento';
COMMENT ON COLUMN public.receitas.tipo_pagamento IS 'Tipo de pagamento (particular ou convênio)';
COMMENT ON COLUMN public.receitas.operadora IS 'Nome da operadora de saúde';
COMMENT ON COLUMN public.receitas.plano_saude IS 'Nome do plano de saúde';
COMMENT ON COLUMN public.receitas.valor IS 'Valor recebido';
COMMENT ON COLUMN public.receitas.observacoes IS 'Observações adicionais';
COMMENT ON COLUMN public.receitas.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.receitas.updated_at IS 'Data da última atualização do registro';

-- Criar índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_receitas_patient_id ON public.receitas(patient_id);
CREATE INDEX IF NOT EXISTS idx_receitas_data ON public.receitas(data);
CREATE INDEX IF NOT EXISTS idx_receitas_user_id ON public.receitas(user_id);
CREATE INDEX IF NOT EXISTS idx_receitas_tipo_pagamento ON public.receitas(tipo_pagamento);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
DROP POLICY IF EXISTS "Usuários podem ver suas próprias receitas" ON public.receitas;
CREATE POLICY "Usuários podem ver suas próprias receitas"
    ON public.receitas
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir suas próprias receitas" ON public.receitas;
CREATE POLICY "Usuários podem inserir suas próprias receitas"
    ON public.receitas
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias receitas" ON public.receitas;
CREATE POLICY "Usuários podem atualizar suas próprias receitas"
    ON public.receitas
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar suas próprias receitas" ON public.receitas;
CREATE POLICY "Usuários podem deletar suas próprias receitas"
    ON public.receitas
    FOR DELETE
    USING (auth.uid() = user_id);

-- Criar trigger para atualizar o updated_at
DROP TRIGGER IF EXISTS set_receitas_updated_at ON public.receitas;
CREATE TRIGGER set_receitas_updated_at
    BEFORE UPDATE ON public.receitas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 