-- Indica se a consulta daquele dia já foi paga.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS paga boolean NOT NULL DEFAULT false;

-- Até outubro/2026 fica pago. Novembro/2026 e os meses seguintes começam em aberto.
UPDATE public.appointments
SET paga = date < '2026-11-01T00:00:00';
