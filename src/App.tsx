import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAulas from "./pages/AdminAulas";
import AdminRelatorios from "./pages/AdminRelatorios";
import AdminTarefas from "./pages/AdminTarefas";
import AdminConquistas from "./pages/AdminConquistas";
import AdminCriarUsuario from "./pages/AdminCriarUsuario";
import AdminResponsaveis from "./pages/AdminResponsaveis";
import StudentDetails from "./pages/StudentDetails";
import AlunoDashboard from "./pages/AlunoDashboard";
import AlunoProgresso from "./pages/AlunoProgresso";
import AlunoTarefas from "./pages/AlunoTarefas";
import AlunoTarefaDetalhes from "./pages/AlunoTarefaDetalhes";
import AlunoConquistas from "./pages/AlunoConquistas";
import AlunoNotificacoes from "./pages/AlunoNotificacoes";
import AdminNotificacoes from "./pages/AdminNotificacoes";
import AlunoCalendario from "./pages/AlunoCalendario";
import AlunoAulas from "./pages/AlunoAulas";
import AdminCalendarioAulas from "./pages/AdminCalendarioAulas";
import ResponsavelDashboard from "./pages/ResponsavelDashboard";
import ResponsavelAlunoDetalhes from "./pages/ResponsavelAlunoDetalhes";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AlunoProtectedRoute from "./components/AlunoProtectedRoute";
import ResponsavelProtectedRoute from "./components/ResponsavelProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rotas Admin */}
          <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
          <Route path="/admin/aulas" element={<AdminProtectedRoute><AdminAulas /></AdminProtectedRoute>} />
          <Route path="/admin/relatorios" element={<AdminProtectedRoute><AdminRelatorios /></AdminProtectedRoute>} />
          <Route path="/admin/tarefas" element={<AdminProtectedRoute><AdminTarefas /></AdminProtectedRoute>} />
          <Route path="/admin/criar-usuario" element={<AdminProtectedRoute><AdminCriarUsuario /></AdminProtectedRoute>} />
          <Route path="/admin/aluno/:aluno_id" element={<AdminProtectedRoute><StudentDetails /></AdminProtectedRoute>} />
          <Route path="/admin/notificacoes" element={<AdminProtectedRoute><AdminNotificacoes /></AdminProtectedRoute>} />
          <Route path="/admin/calendario-aulas" element={<AdminProtectedRoute><AdminCalendarioAulas /></AdminProtectedRoute>} />
          <Route path="/admin/responsaveis" element={<AdminProtectedRoute><AdminResponsaveis /></AdminProtectedRoute>} />
          <Route path="/admin/conquistas" element={<AdminProtectedRoute><AdminConquistas /></AdminProtectedRoute>} />
          
          {/* Rotas Aluno */}
          <Route path="/aluno/dashboard" element={<AlunoProtectedRoute><AlunoDashboard /></AlunoProtectedRoute>} />
          <Route path="/aluno/progresso" element={<AlunoProtectedRoute><AlunoProgresso /></AlunoProtectedRoute>} />
          <Route path="/aluno/tarefas" element={<AlunoProtectedRoute><AlunoTarefas /></AlunoProtectedRoute>} />
          <Route path="/aluno/tarefas/:tarefa_id" element={<AlunoProtectedRoute><AlunoTarefaDetalhes /></AlunoProtectedRoute>} />
          <Route path="/aluno/conquistas" element={<AlunoProtectedRoute><AlunoConquistas /></AlunoProtectedRoute>} />
          <Route path="/aluno/notificacoes" element={<AlunoProtectedRoute><AlunoNotificacoes /></AlunoProtectedRoute>} />
          <Route path="/aluno/calendario" element={<AlunoProtectedRoute><AlunoCalendario /></AlunoProtectedRoute>} />
          <Route path="/aluno/aulas" element={<AlunoProtectedRoute><AlunoAulas /></AlunoProtectedRoute>} />
          
          {/* Rotas Responsável */}
          <Route path="/responsavel/dashboard" element={<ResponsavelProtectedRoute><ResponsavelDashboard /></ResponsavelProtectedRoute>} />
          <Route path="/responsavel/aluno/:aluno_id" element={<ResponsavelProtectedRoute><ResponsavelAlunoDetalhes /></ResponsavelProtectedRoute>} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
