import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText, X, Paperclip } from "lucide-react";

const formSchema = z.object({
  aluno_id: z.string().min(1, "Selecione um aluno"),
  titulo: z.string().min(1, "Título é obrigatório").max(200, "Título muito longo"),
  descricao: z.string().max(1000, "Descrição muito longa").optional(),
  tipo: z.enum(["Obrigatoria", "Sugerida"]),
  data_limite: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NovaTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    aluno_id: string;
    titulo: string;
    descricao?: string;
    tipo: string;
    data_limite?: string;
    arquivo_enunciado?: File;
  }) => void;
  isSubmitting: boolean;
}

export function NovaTarefaDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: NovaTarefaDialogProps) {
  const [arquivoEnunciado, setArquivoEnunciado] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      aluno_id: "",
      titulo: "",
      descricao: "",
      tipo: "Obrigatoria",
      data_limite: "",
    },
  });

  const { data: alunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ["alunos-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("user_id, nome_completo")
        .eq("tipo_usuario", "Aluno")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      setArquivoEnunciado(file);
    }
  };

  const removeFile = () => {
    setArquivoEnunciado(null);
  };

  const handleSubmit = (data: FormValues) => {
    const tarefaData = {
      aluno_id: data.aluno_id,
      titulo: data.titulo,
      tipo: data.tipo,
      descricao: data.descricao || undefined,
      data_limite: data.data_limite || undefined,
      arquivo_enunciado: arquivoEnunciado || undefined,
    };
    onSubmit(tarefaData);
    // NÃO resetar aqui - o reset será feito pelo pai quando a criação for bem sucedida
  };

  const resetForm = () => {
    form.reset();
    setArquivoEnunciado(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>
            Crie uma nova tarefa para um aluno. Tarefas obrigatórias gerarão notificações e emails.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="aluno_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aluno *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loadingAlunos}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um aluno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {alunos?.map((aluno) => (
                        <SelectItem key={aluno.user_id} value={aluno.user_id}>
                          {aluno.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Exercícios de gramática" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a tarefa com mais detalhes..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Upload do PDF de enunciado */}
            <div className="space-y-2">
              <FormLabel>PDF do Enunciado</FormLabel>
              {arquivoEnunciado ? (
                <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm truncate max-w-[300px]">{arquivoEnunciado.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(arquivoEnunciado.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={removeFile}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label 
                    htmlFor="arquivo-enunciado" 
                    className="flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors text-sm"
                  >
                    <Paperclip className="h-4 w-4" />
                    Anexar PDF
                  </label>
                  <input
                    id="arquivo-enunciado"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="hidden"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Opcional - Anexe um PDF com o enunciado da tarefa (máx. 10MB)
              </p>
            </div>

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Obrigatoria">Obrigatória</SelectItem>
                      <SelectItem value="Sugerida">Sugerida</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Tarefas obrigatórias enviam notificação e email ao aluno
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_limite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Limite</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    Opcional - deixe em branco se não houver prazo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
