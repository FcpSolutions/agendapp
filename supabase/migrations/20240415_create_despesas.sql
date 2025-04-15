-- Criar função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar tabela de despesas se não existir
CREATE TABLE IF NOT EXISTS despesas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    descricao TEXT NOT NULL,
    data DATE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    categoria TEXT NOT NULL,
    forma_pagamento TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT despesas_categoria_check CHECK (categoria IN (
        'Material de Escritório',
        'Equipamentos',
        'Serviços',
        'Impostos',
        'Aluguel',
        'Água',
        'Luz',
        'Internet',
        'Telefone',
        'Outros'
    )),
    CONSTRAINT despesas_forma_pagamento_check CHECK (forma_pagamento IN (
        'Dinheiro',
        'Cartão de Débito',
        'Cartão de Crédito',
        'PIX',
        'Transferência',
        'Boleto'
    ))
);

-- Comentários na tabela
COMMENT ON TABLE despesas IS 'Tabela para armazenar as despesas do consultório';
COMMENT ON COLUMN despesas.id IS 'Identificador único da despesa';
COMMENT ON COLUMN despesas.user_id IS 'ID do usuário que criou a despesa';
COMMENT ON COLUMN despesas.descricao IS 'Descrição da despesa';
COMMENT ON COLUMN despesas.data IS 'Data da despesa';
COMMENT ON COLUMN despesas.valor IS 'Valor da despesa';
COMMENT ON COLUMN despesas.categoria IS 'Categoria da despesa';
COMMENT ON COLUMN despesas.forma_pagamento IS 'Forma de pagamento da despesa';
COMMENT ON COLUMN despesas.observacoes IS 'Observações adicionais sobre a despesa';

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS despesas_user_id_idx ON despesas(user_id);
CREATE INDEX IF NOT EXISTS despesas_data_idx ON despesas(data);
CREATE INDEX IF NOT EXISTS despesas_categoria_idx ON despesas(categoria);

-- Habilitar Row Level Security
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias despesas"
    ON despesas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias despesas"
    ON despesas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias despesas"
    ON despesas FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias despesas"
    ON despesas FOR DELETE
    USING (auth.uid() = user_id);

-- Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_despesas_updated_at ON despesas;
CREATE TRIGGER update_despesas_updated_at
    BEFORE UPDATE ON despesas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 