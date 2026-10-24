import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Mail, MapPin, Phone, Trash2, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';

interface Patient {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  created_at: string;
  ativo?: boolean;
  tipo_paciente?: string;
  convenio_nome?: string;
  convenio_operadora?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: {
    cep: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    estado: string;
    numero: string;
    complemento: string;
  };
}

interface PatientCardProps {
  patient: Patient;
  onDelete: (id: string) => void;
  onEdit: (patient: Patient) => void;
  onToggleAtivo?: (patient: Patient) => void;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function PatientCard({ patient, onDelete, onEdit, onToggleAtivo }: PatientCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const inativo = patient.ativo === false;
  const convenio = patient.tipo_paciente === 'convenio';

  const visual = inativo
    ? {
        faixa: 'bg-slate-400',
        texto: 'text-slate-500',
        botao: 'border-slate-300 text-slate-600 hover:bg-slate-500 hover:text-white',
      }
    : convenio
      ? {
          faixa: 'bg-[#5b4bd6]',
          texto: 'text-[#5b4bd6]',
          botao: 'border-[#5b4bd6] text-[#5b4bd6] hover:bg-[#5b4bd6] hover:text-white',
        }
      : {
          faixa: 'bg-[#0f9f8f]',
          texto: 'text-[#0d8a7c]',
          botao: 'border-[#0f9f8f] text-[#0d8a7c] hover:bg-[#0f9f8f] hover:text-white',
        };

  const tipoLabel = convenio
    ? patient.convenio_nome || 'Convênio'
    : 'Particular';
  const cidade = patient.endereco?.cidade
    ? `${patient.endereco.cidade}${patient.endereco.estado ? `/${patient.endereco.estado}` : ''}`
    : '';

  return (
    <article className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-shadow hover:shadow-lg ${inativo ? 'opacity-80' : ''}`}>
      <div className={`relative h-24 ${visual.faixa}`}>
        {inativo && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            Inativo
          </span>
        )}
      </div>

      <div className="-mt-12 flex flex-col items-center px-5 pb-5 text-center">
        <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white text-2xl font-semibold shadow-md">
          <span className={visual.texto}>{iniciais(patient.nome)}</span>
        </div>

        <h3 className="mt-3 text-lg font-bold leading-tight text-gray-900">{patient.nome}</h3>
        <p className={`mt-1 text-sm font-medium ${visual.texto}`}>
          {tipoLabel}
          {convenio && patient.convenio_operadora ? ` · ${patient.convenio_operadora}` : ''}
        </p>

        <div className="mt-3 w-full space-y-1 text-sm text-gray-500">
          <p className="flex items-center justify-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{patient.telefone}</span>
          </p>
          <p className="flex items-center justify-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{patient.email}</span>
          </p>
          {cidade && (
            <p className="flex items-center justify-center gap-1.5 text-gray-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{cidade}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((atual) => !atual)}
          className={`mt-4 w-full rounded-md border-2 bg-white px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${visual.botao}`}
        >
          {showDetails ? 'OCULTAR DETALHES' : 'VER DETALHES'}
        </button>

        {showDetails && (
          <div className="mt-4 w-full space-y-1.5 border-t border-gray-100 pt-4 text-left text-sm text-gray-600">
            {patient.cpf && (
              <p><span className="font-medium text-gray-700">CPF:</span> {patient.cpf}</p>
            )}
            {patient.data_nascimento && (
              <p>
                <span className="font-medium text-gray-700">Nascimento:</span>{' '}
                {format(new Date(patient.data_nascimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
            <p>
              <span className="font-medium text-gray-700">Cadastro:</span>{' '}
              {format(new Date(patient.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            {patient.endereco?.logradouro && (
              <p>
                <span className="font-medium text-gray-700">Endereço:</span>{' '}
                {patient.endereco.logradouro}, {patient.endereco.numero}
                {patient.endereco.complemento ? ` - ${patient.endereco.complemento}` : ''}
                {patient.endereco.bairro ? `, ${patient.endereco.bairro}` : ''}
                {patient.endereco.cep ? ` · CEP ${patient.endereco.cep}` : ''}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex w-full items-center justify-center gap-2">
          {onToggleAtivo && (
            <button
              type="button"
              onClick={() => onToggleAtivo(patient)}
              title={inativo ? 'Reativar' : 'Inativar'}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              {inativo ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
              {inativo ? 'Reativar' : 'Inativar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(patient)}
            title="Editar"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <Edit className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(patient.id)}
            title="Excluir"
            className="inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
}
