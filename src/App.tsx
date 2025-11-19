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
import ProtectedRoute from "./components/ProtectedRoute";

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
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/aulas" element={<ProtectedRoute><AdminAulas /></ProtectedRoute>} />
          <Route path="/admin/relatorios" element={<ProtectedRoute><AdminRelatorios /></ProtectedRoute>} />
          <Route path="/admin/tarefas" element={<ProtectedRoute><AdminTarefas /></ProtectedRoute>} />
          <Route path="/admin/aluno/:aluno_id" element={<ProtectedRoute><StudentDetails /></ProtectedRoute>} />
          <Route path="/aluno/dashboard" element={<AlunoDashboard />} />
          <Route path="/aluno/progresso" element={<AlunoProgresso />} />
          <Route path="/aluno/tarefas" element={<AlunoTarefas />} />
          <Route path="/aluno/tarefas/:tarefa_id" element={<AlunoTarefaDetalhes />} />
          <Route path="/aluno/conquistas" element={<AlunoConquistas />} />
          <Route path="/aluno/notificacoes" element={<AlunoNotificacoes />} />
          <Route path="/aluno/calendario" element={<AlunoCalendario />} />
          <Route path="/aluno/aulas" element={<AlunoAulas />} />
          <Route path="/admin/notificacoes" element={<ProtectedRoute><AdminNotificacoes /></ProtectedRoute>} />
          <Route path="/admin/calendario-aulas" element={<ProtectedRoute><AdminCalendarioAulas /></ProtectedRoute>} />
          <Route path="/responsavel/dashboard" element={<ResponsavelDashboard />} />
          <Route path="/responsavel/aluno/:aluno_id" element={<ResponsavelAlunoDetalhes />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
