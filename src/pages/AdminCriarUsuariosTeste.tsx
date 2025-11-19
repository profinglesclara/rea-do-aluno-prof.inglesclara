import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, CheckCircle2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UsuarioCriado {
  tipo: string;
  user_id: string;
  email: string;
  senha: string;
}

const AdminCriarUsuariosTeste = () => {
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioCriado[]>([]);
  const { toast } = useToast();

  const handleCriarUsuarios = async () => {
    setLoading(true);
    setUsuarios([]);

    try {
      const { data, error } = await supabase.functions.invoke('criar-usuarios-teste');

      if (error) throw error;

      if (data.success) {
        setUsuarios(data.usuarios);
        toast({
          title: "Sucesso!",
          description: "Usuários de teste criados com sucesso.",
        });
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error: any) {
      console.error('Erro ao criar usuários:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar os usuários de teste.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Criar Usuários de Teste</h1>
          <p className="text-muted-foreground mt-2">
            Esta página cria automaticamente usuários de teste no sistema.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ação de Criação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique no botão abaixo para criar automaticamente:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>Responsável Teste</strong> - email: responsavel.teste@teste.com
              </li>
              <li>
                <strong>Aluno Adulto Teste</strong> - email: aluno.adulto@teste.com
              </li>
            </ul>
            <Button 
              onClick={handleCriarUsuarios} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando usuários...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Usuários de Teste
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {usuarios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Usuários Criados com Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {usuarios.map((usuario, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{usuario.tipo}</h3>
                    <Badge variant="outline">Criado</Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">User ID:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {usuario.user_id.substring(0, 8)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(usuario.user_id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {usuario.email}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(usuario.email)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Senha:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {usuario.senha}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(usuario.senha)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href="/login"
                      className="text-sm text-primary hover:underline"
                    >
                      → Ir para página de login
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminCriarUsuariosTeste;
