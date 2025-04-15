-- Criar bucket para templates se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Criar política para permitir upload de arquivos para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

-- Criar política para permitir leitura pública dos templates
CREATE POLICY "Acesso público para leitura de templates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'templates'); 