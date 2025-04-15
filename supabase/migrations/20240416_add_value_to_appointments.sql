-- Adicionar coluna de valor à tabela de consultas
ALTER TABLE appointments
ADD COLUMN value DECIMAL(10,2) DEFAULT 0.00;

-- Atualizar registros existentes para ter um valor padrão
UPDATE appointments
SET value = 0.00
WHERE value IS NULL; 