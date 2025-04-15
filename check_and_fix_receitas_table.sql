-- Verificar se a tabela receitas existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'receitas') THEN
        -- Verificar se a coluna tipo_pagamento existe
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'receitas' 
            AND column_name = 'tipo_pagamento'
        ) THEN
            -- Adicionar a coluna tipo_pagamento
            ALTER TABLE public.receitas ADD COLUMN tipo_pagamento TEXT NOT NULL DEFAULT 'particular';
            
            -- Adicionar a restrição CHECK
            ALTER TABLE public.receitas ADD CONSTRAINT check_tipo_pagamento 
            CHECK (tipo_pagamento IN ('particular', 'convenio'));
            
            -- Adicionar comentário na coluna
            COMMENT ON COLUMN public.receitas.tipo_pagamento IS 'Tipo de pagamento (particular ou convênio)';
            
            -- Criar índice para otimizar buscas
            CREATE INDEX IF NOT EXISTS idx_receitas_tipo_pagamento ON public.receitas(tipo_pagamento);
            
            RAISE NOTICE 'Coluna tipo_pagamento adicionada à tabela receitas';
        ELSE
            RAISE NOTICE 'A coluna tipo_pagamento já existe na tabela receitas';
        END IF;
        
        -- Verificar se a coluna operadora existe
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'receitas' 
            AND column_name = 'operadora'
        ) THEN
            -- Adicionar a coluna operadora
            ALTER TABLE public.receitas ADD COLUMN operadora TEXT;
            
            -- Adicionar comentário na coluna
            COMMENT ON COLUMN public.receitas.operadora IS 'Nome da operadora de convênio';
            
            -- Criar índice para otimizar buscas
            CREATE INDEX IF NOT EXISTS idx_receitas_operadora ON public.receitas(operadora);
            
            RAISE NOTICE 'Coluna operadora adicionada à tabela receitas';
        ELSE
            RAISE NOTICE 'A coluna operadora já existe na tabela receitas';
        END IF;
        
        -- Verificar se a coluna plano_saude existe
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'receitas' 
            AND column_name = 'plano_saude'
        ) THEN
            -- Adicionar a coluna plano_saude
            ALTER TABLE public.receitas ADD COLUMN plano_saude TEXT;
            
            -- Adicionar comentário na coluna
            COMMENT ON COLUMN public.receitas.plano_saude IS 'Nome do plano de saúde';
            
            -- Criar índice para otimizar buscas
            CREATE INDEX IF NOT EXISTS idx_receitas_plano_saude ON public.receitas(plano_saude);
            
            RAISE NOTICE 'Coluna plano_saude adicionada à tabela receitas';
        ELSE
            RAISE NOTICE 'A coluna plano_saude já existe na tabela receitas';
        END IF;
        
        -- Verificar se a coluna valor existe
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'receitas' 
            AND column_name = 'valor'
        ) THEN
            -- Adicionar a coluna valor
            ALTER TABLE public.receitas ADD COLUMN valor DECIMAL(10,2) NOT NULL DEFAULT 0.00;
            
            -- Adicionar comentário na coluna
            COMMENT ON COLUMN public.receitas.valor IS 'Valor da receita';
            
            -- Criar índice para otimizar buscas
            CREATE INDEX IF NOT EXISTS idx_receitas_valor ON public.receitas(valor);
            
            RAISE NOTICE 'Coluna valor adicionada à tabela receitas';
        ELSE
            RAISE NOTICE 'A coluna valor já existe na tabela receitas';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela receitas não existe';
    END IF;
END $$; 