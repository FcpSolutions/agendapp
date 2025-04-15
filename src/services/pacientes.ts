import { supabase } from '@/lib/supabase'
import { Paciente } from '@/types/paciente'

export async function createPaciente(paciente: Omit<Paciente, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('pacientes')
    .insert([paciente])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listPacientes() {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function deletePaciente(id: string) {
  const { error } = await supabase
    .from('pacientes')
    .delete()
    .eq('id', id)

  if (error) throw error
} 