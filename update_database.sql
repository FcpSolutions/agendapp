-- Adicionar novos campos à tabela patients
ALTER TABLE public.patients
ADD COLUMN cpf text,
ADD COLUMN data_nascimento date,
ADD COLUMN endereco jsonb;

-- Atualizar as políticas de segurança para incluir os novos campos
DROP POLICY IF EXISTS "Users can insert their own patients" ON public.patients;
CREATE POLICY "Users can insert their own patients"
  ON public.patients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own patients" ON public.patients;
CREATE POLICY "Users can update their own patients"
  ON public.patients
  FOR UPDATE
  USING (auth.uid() = user_id); 