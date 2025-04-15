import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key são necessários')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function resetPassword(email: string) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
}

export async function updatePassword(newPassword: string) {
  return await supabase.auth.updateUser({
    password: newPassword
  })
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signUp(email: string, password: string) {
  try {
    console.log('Tentando registrar usuário com:', { email })
    
    // Determinar a URL de base correta conforme o ambiente
    let redirectUrl = '';
    
    // Verificar se estamos em ambiente de produção (Vercel)
    if (import.meta.env.PROD) {
      // URL de produção (ajuste para a URL correta do seu site)
      redirectUrl = 'https://agendapp-gilt.vercel.app/login';
    } else {
      // URL local para desenvolvimento
      redirectUrl = `${window.location.origin}/login`;
    }
    
    console.log('URL de redirecionamento:', redirectUrl);
    
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      }
    })
  } catch (error) {
    console.error('Erro na função signUp:', error)
    throw error
  }
}

export async function signOut() {
  return await supabase.auth.signOut()
} 