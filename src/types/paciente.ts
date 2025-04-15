export interface Paciente {
  id?: string
  nome: string
  data_nascimento: string
  cpf: string
  telefone: string
  responsavel?: string
  tipo_paciente: 'particular' | 'convenio'
  convenio?: string
  operadora?: string
  cep: string
  numero: string
  complemento?: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  created_at?: string
} 