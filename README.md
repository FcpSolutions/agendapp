# Sistema de Autenticação com Supabase

Este é um sistema de autenticação completo construído com React, TypeScript e Supabase, incluindo funcionalidades de login, registro e recuperação de senha.

## Funcionalidades

- Login com email e senha
- Registro de novos usuários
- Recuperação de senha
- Interface responsiva
- Feedback visual para o usuário
- Proteção de rotas

## Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie um projeto no [Supabase](https://supabase.com)
   - Copie a URL do projeto e a chave anônima
   - Crie um arquivo `.env` na raiz do projeto
   - Adicione as seguintes variáveis:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Tecnologias Utilizadas

- React
- TypeScript
- Vite
- Supabase
- Chakra UI
- React Router

## Estrutura do Projeto

```
src/
  ├── components/
  │   ├── Login.tsx
  │   ├── Register.tsx
  │   └── ForgotPassword.tsx
  ├── lib/
  │   └── supabase.ts
  ├── App.tsx
  └── main.tsx
```

## Contribuição

Sinta-se à vontade para contribuir com o projeto. Abra uma issue ou envie um pull request.

## Licença

MIT

# AgendApp

Sistema de agendamento de consultas médicas.

## Configuração do Supabase

Para que o sistema funcione corretamente, é necessário configurar o Supabase com as seguintes tabelas:

### Tabela de Pacientes

```sql
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  cpf TEXT,
  endereco TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar políticas de segurança
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Política para permitir que os usuários vejam seus próprios pacientes
CREATE POLICY "Users can view their own patients" 
  ON patients FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para permitir que os usuários insiram seus próprios pacientes
CREATE POLICY "Users can insert their own patients" 
  ON patients FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para permitir que os usuários atualizem seus próprios pacientes
CREATE POLICY "Users can update their own patients" 
  ON patients FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para permitir que os usuários excluam seus próprios pacientes
CREATE POLICY "Users can delete their own patients" 
  ON patients FOR DELETE 
  USING (auth.uid() = user_id);
```

### Tabela de Consultas

```sql
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar políticas de segurança
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Política para permitir que os usuários vejam suas próprias consultas
CREATE POLICY "Users can view their own appointments" 
  ON appointments FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para permitir que os usuários insiram suas próprias consultas
CREATE POLICY "Users can insert their own appointments" 
  ON appointments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para permitir que os usuários atualizem suas próprias consultas
CREATE POLICY "Users can update their own appointments" 
  ON appointments FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para permitir que os usuários excluam suas próprias consultas
CREATE POLICY "Users can delete their own appointments" 
  ON appointments FOR DELETE 
  USING (auth.uid() = user_id);
```

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```
4. Execute o projeto:
   ```
   npm run dev
   ```

## Funcionalidades

- Autenticação de usuários
- Cadastro de pacientes
- Agendamento de consultas
- Visualização de agenda
- Dashboard com informações relevantes
