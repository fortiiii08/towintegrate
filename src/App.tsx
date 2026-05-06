import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterClientPage from "./pages/auth/RegisterClientPage";
import RegisterEmployeePage from "./pages/auth/RegisterEmployeePage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// App pages
import Home from "./pages/Home";
import Trafego from "./pages/Trafego";
import Postagens from "./pages/Postagens";
import Cidade from "./pages/Cidade";
import Gravacoes from "./pages/Gravacoes";
import GravacoesAgenda from "./pages/GravacoesAgenda";
import PostagensLinks from "./pages/PostagensLinks";
import Tarefas from "./pages/Tarefas";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import InboxPage from "./pages/InboxPage";

import MapaCidade from "./pages/Index";
import NotFound from "./pages/NotFound";
import Portal from "./pages/Portal";
import ClientDocsPage from "./pages/cidade/ClientDocsPage";
import LendasLogin from "./pages/lendas/LendasLogin";
import LendasHome from "./pages/lendas/LendasHome";
import { LendasProtectedRoute } from "./components/lendas/LendasProtectedRoute";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Portal */}
            <Route path="/portal" element={<Portal />} />

            {/* Lendas auth */}
            <Route path="/lendas/login" element={<LendasLogin />} />

            {/* Lendas protected */}
            <Route path="/lendas/home" element={
              <LendasProtectedRoute><LendasHome /></LendasProtectedRoute>
            } />

            {/* Auth routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register/client" element={<RegisterClientPage />} />
            <Route path="/auth/register/employee" element={<RegisterEmployeePage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* Tráfego — lista de clientes */}
            <Route
              path="/trafego"
              element={
                <ProtectedRoute allowedRoles={["employee", "client"]}>
                  <Trafego />
                </ProtectedRoute>
              }
            />

            <Route
              path="/postagens"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <Postagens />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cidade"
              element={
                <ProtectedRoute allowedRoles={["employee", "client"]}>
                  <Cidade />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cidade/:clientId/docs"
              element={
                <ProtectedRoute allowedRoles={["employee", "client"]}>
                  <ClientDocsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tarefas"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <Tarefas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <Financeiro />
                </ProtectedRoute>
              }
            />


            {/* Routes for both roles */}
            <Route
              path="/gravacoes"
              element={
                <ProtectedRoute allowedRoles={["client", "employee"]}>
                  <Gravacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gravacoes/agenda"
              element={
                <ProtectedRoute allowedRoles={["client", "employee"]}>
                  <GravacoesAgenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gravacoes/postagens"
              element={
                <ProtectedRoute allowedRoles={["client", "employee"]}>
                  <PostagensLinks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute allowedRoles={["client", "employee"]}>
                  <Clientes />
                </ProtectedRoute>
              }
            />

            {/* Inbox */}
            <Route
              path="/inbox"
              element={
                <ProtectedRoute allowedRoles={["client", "employee"]}>
                  <InboxPage />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;