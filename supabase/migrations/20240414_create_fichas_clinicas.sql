-- Criar a função set_updated_at se ela não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fichas_clinicas') THEN
        -- Criar a tabela de fichas clínicas
        CREATE TABLE public.fichas_clinicas (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            data_consulta DATE NOT NULL,
            queixa_principal TEXT NOT NULL,
            diagnostico TEXT NOT NULL,
            conduta TEXT NOT NULL,
            observacoes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Adicionar comentários
        COMMENT ON TABLE public.fichas_clinicas IS 'Fichas clínicas dos pacientes';
        COMMENT ON COLUMN public.fichas_clinicas.id IS 'ID único da ficha clínica';
        COMMENT ON COLUMN public.fichas_clinicas.patient_id IS 'ID do paciente';
        COMMENT ON COLUMN public.fichas_clinicas.user_id IS 'ID do usuário que criou a ficha';
        COMMENT ON COLUMN public.fichas_clinicas.data_consulta IS 'Data da consulta';
        COMMENT ON COLUMN public.fichas_clinicas.queixa_principal IS 'Queixa principal do paciente';
        COMMENT ON COLUMN public.fichas_clinicas.diagnostico IS 'Diagnóstico realizado';
        COMMENT ON COLUMN public.fichas_clinicas.conduta IS 'Conduta adotada';
        COMMENT ON COLUMN public.fichas_clinicas.observacoes IS 'Observações adicionais';
        COMMENT ON COLUMN public.fichas_clinicas.created_at IS 'Data de criação do registro';
        COMMENT ON COLUMN public.fichas_clinicas.updated_at IS 'Data de atualização do registro';

        -- Criar índice para busca por paciente
        CREATE INDEX idx_fichas_clinicas_patient_id ON public.fichas_clinicas(patient_id);
        
        -- Criar índice para busca por data
        CREATE INDEX idx_fichas_clinicas_data_consulta ON public.fichas_clinicas(data_consulta);

        -- Criar índice para busca por usuário
        CREATE INDEX idx_fichas_clinicas_user_id ON public.fichas_clinicas(user_id);

        -- Habilitar RLS (Row Level Security)
        ALTER TABLE public.fichas_clinicas ENABLE ROW LEVEL SECURITY;

        -- Criar políticas de segurança
        CREATE POLICY "Usuários podem ver suas próprias fichas clínicas"
            ON public.fichas_clinicas
            FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Usuários podem inserir suas próprias fichas clínicas"
            ON public.fichas_clinicas
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Usuários podem atualizar suas próprias fichas clínicas"
            ON public.fichas_clinicas
            FOR UPDATE
            USING (auth.uid() = user_id);

        CREATE POLICY "Usuários podem excluir suas próprias fichas clínicas"
            ON public.fichas_clinicas
            FOR DELETE
            USING (auth.uid() = user_id);
        
        -- Criar trigger para atualizar o updated_at
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON public.fichas_clinicas
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END
$$; 