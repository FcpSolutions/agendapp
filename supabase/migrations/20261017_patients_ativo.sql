-- Mantém o histórico do paciente e permite ocultá-lo das listas sem excluir o cadastro.
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
