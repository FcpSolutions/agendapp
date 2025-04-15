import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { useState } from 'react';

interface Patient {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  created_at: string;
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
}

export function PatientCard({ patient, onDelete, onEdit }: PatientCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="cursor-pointer" onClick={toggleDetails}>
        <CardTitle className="flex items-center justify-between">
          <span>{patient.nome}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleDetails();
            }}
            className="ml-2"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Email:</span> {patient.email}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Telefone:</span> {patient.telefone}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Cadastrado em:</span>{' '}
          {format(new Date(patient.created_at), "dd 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
        </p>

        {showDetails && (
          <div className="mt-4 pt-4 border-t space-y-2">
            {patient.cpf && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">CPF:</span> {patient.cpf}
              </p>
            )}
            
            {patient.data_nascimento && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Data de Nascimento:</span>{' '}
                {format(new Date(patient.data_nascimento), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            )}

            {patient.endereco && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Endereço:</p>
                <div className="pl-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    {patient.endereco.logradouro}, {patient.endereco.numero}
                    {patient.endereco.complemento && ` - ${patient.endereco.complemento}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {patient.endereco.bairro} - {patient.endereco.cidade}/{patient.endereco.estado}
                  </p>
                  <p className="text-sm text-gray-600">
                    CEP: {patient.endereco.cep}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(patient)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(patient.id)}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </CardFooter>
    </Card>
  );
} 