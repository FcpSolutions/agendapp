-- Tipo do paciente para diferenciar particular e convênio nos cards.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS tipo_paciente text NOT NULL DEFAULT 'particular',
  ADD COLUMN IF NOT EXISTS convenio_nome text,
  ADD COLUMN IF NOT EXISTS convenio_operadora text;

-- Usa o tipo da consulta mais recente para quem já tem agendamento.
UPDATE public.patients AS p
SET
  tipo_paciente = a.patient_type,
  convenio_nome = a.convenio_nome,
  convenio_operadora = a.convenio_operadora
FROM (
  SELECT DISTINCT ON (patient_id)
    patient_id,
    patient_type,
    convenio_nome,
    convenio_operadora
  FROM public.appointments
  WHERE patient_type IN ('particular', 'convenio')
  ORDER BY patient_id, date DESC
) AS a
WHERE p.id = a.patient_id;
