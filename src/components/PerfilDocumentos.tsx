import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function PerfilDocumentos() {
  const { user } = useAuth()
  const [papelTimbrado, setPapelTimbrado] = useState<File | null>(null)
  const [assinatura, setAssinatura] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  // Carregar dados do perfil ao iniciar
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (!error && data) {
          setProfile(data)
        }
      }
      
      fetchProfile()
    }
  }, [user])

  const handleUpload = async () => {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      let papelTimbradoUrl = profile?.papel_timbrado_url
      let assinaturaUrl = profile?.assinatura_url
      
      // Upload do papel timbrado se selecionado
      if (papelTimbrado) {
        const fileName = `${user.id}_${Date.now()}`
        const { error: uploadError } = await supabase.storage
          .from('letterheads')
          .upload(fileName, papelTimbrado)
        
        if (uploadError) throw uploadError
        
        const { data: publicUrlData } = supabase.storage
          .from('letterheads')
          .getPublicUrl(fileName)
          
        papelTimbradoUrl = publicUrlData.publicUrl
      }
      
      // Upload da assinatura se selecionada
      if (assinatura) {
        const fileName = `${user.id}_${Date.now()}`
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fileName, assinatura)
        
        if (uploadError) throw uploadError
        
        const { data: publicUrlData } = supabase.storage
          .from('signatures')
          .getPublicUrl(fileName)
          
        assinaturaUrl = publicUrlData.publicUrl
      }
      
      // Atualizar o perfil com as URLs
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          papel_timbrado_url: papelTimbradoUrl,
          assinatura_url: assinaturaUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (updateError) throw updateError
      
      toast.success('Configurações de documentos atualizadas com sucesso!')
      
      // Atualizar o estado do perfil
      setProfile({
        ...profile,
        papel_timbrado_url: papelTimbradoUrl,
        assinatura_url: assinaturaUrl
      })
      
      // Limpar os arquivos selecionados
      setPapelTimbrado(null)
      setAssinatura(null)
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.error('Erro ao salvar configurações de documentos')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Documentos Personalizados</h2>
      
      <div className="space-y-6">
        <div>
          <Label htmlFor="papel-timbrado">Papel Timbrado</Label>
          <div className="mt-2 border-2 border-dashed rounded-md p-6">
            {profile?.papel_timbrado_url ? (
              <div className="flex flex-col items-center">
                <img 
                  src={profile.papel_timbrado_url} 
                  alt="Papel Timbrado" 
                  className="max-h-48 object-contain mb-3" 
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('papel-timbrado')?.click()}
                >
                  Alterar Papel Timbrado
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Faça upload do seu papel timbrado (PNG, JPG ou PDF)
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('papel-timbrado')?.click()}
                >
                  Selecionar Arquivo
                </Button>
              </div>
            )}
            <input
              id="papel-timbrado"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={(e) => e.target.files && setPapelTimbrado(e.target.files[0])}
              className="hidden"
              title="Upload de papel timbrado"
              aria-label="Upload de papel timbrado"
            />
            {papelTimbrado && (
              <p className="text-sm text-green-600 mt-2">
                Arquivo selecionado: {papelTimbrado.name}
              </p>
            )}
          </div>
        </div>
        
        <div>
          <Label htmlFor="assinatura">Assinatura Digital</Label>
          <div className="mt-2 border-2 border-dashed rounded-md p-6">
            {profile?.assinatura_url ? (
              <div className="flex flex-col items-center">
                <img 
                  src={profile.assinatura_url} 
                  alt="Assinatura" 
                  className="max-h-24 object-contain mb-3" 
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('assinatura')?.click()}
                >
                  Alterar Assinatura
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Faça upload da sua assinatura (PNG ou JPG com fundo transparente)
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('assinatura')?.click()}
                >
                  Selecionar Arquivo
                </Button>
              </div>
            )}
            <input
              id="assinatura"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => e.target.files && setAssinatura(e.target.files[0])}
              className="hidden"
              title="Upload de assinatura"
              aria-label="Upload de assinatura"
            />
            {assinatura && (
              <p className="text-sm text-green-600 mt-2">
                Arquivo selecionado: {assinatura.name}
              </p>
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleUpload} 
          disabled={isLoading || (!papelTimbrado && !assinatura && !profile?.papel_timbrado_url && !profile?.assinatura_url)}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </div>
  )
} 