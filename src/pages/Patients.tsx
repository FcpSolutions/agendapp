import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Paciente } from '@/types/paciente'
import { listPacientes, deletePaciente } from '@/services/pacientes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Patients() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPacientes()
  }, [])

  async function loadPacientes() {
    try {
      const data = await listPacientes()
      setPacientes(data)
    } catch (err) {
      setError('Erro ao carregar pacientes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    
    if (window.confirm('Tem certeza que deseja excluir este paciente?')) {
      try {
        await deletePaciente(id);
        loadPacientes();
      } catch (error) {
        console.error('Erro ao deletar paciente:', error);
      }
    }
  };

  if (loading) return <div className="flex justify-center p-8">Carregando...</div>
  if (error) return <div className="text-red-500 p-8">{error}</div>

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pacientes</h1>
        <Link 
          to="/new-patient"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Novo Paciente
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Nasc.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pacientes.map(paciente => (
              <tr key={paciente.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{paciente.nome}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(paciente.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{paciente.cpf}</td>
                <td className="px-6 py-4 whitespace-nowrap">{paciente.telefone}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{paciente.tipo_paciente}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleDelete(paciente.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 