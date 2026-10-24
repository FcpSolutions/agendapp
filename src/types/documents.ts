// Tipos de campo para os modelos de relatórios
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';

export interface DocumentField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // Para campos select
  defaultValue?: string | number | boolean;
}

export interface DocumentTemplate {
  id: string;
  user_id?: string;
  title: string;
  type: 'atestado' | 'exame' | 'encaminhamento' | 'outro';
  is_system: boolean;
  file_path?: string;
  html_template: string;
  fields: DocumentField[];
  created_at?: string;
  updated_at?: string;
}

export interface DocumentHistory {
  id: string;
  template_id: string;
  user_id: string;
  patient_id: string;
  title: string;
  content: string;
  field_values: Record<string, any>;
  created_at: string;
}

// Tipo para valores dos campos preenchidos pelo usuário
export type FieldValues = Record<string, string | number | boolean>; 