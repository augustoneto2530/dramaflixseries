import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Plans from "./pages/Plans";
import Category from "./pages/Category";
import ContentDetails from "./pages/ContentDetails";
import Search from "./pages/Search";
import Support from "./pages/Support";
import Watchlist from "./pages/Watchlist";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminMembers from "./pages/admin/Members";
import AdminContents from "./pages/admin/Contents";
import AdminWebhooks from "./pages/admin/Webhooks";
import AdminAdultAccess from "./pages/admin/AdultAccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/entrar" element={<Auth />} />
            <Route path="/planos" element={<Plans />} />
            <Route path="/categoria/:category" element={<Category />} />
            <Route path="/conteudo/:id" element={<ContentDetails />} />
            <Route path="/buscar" element={<Search />} />
            <Route path="/suporte" element={<Support />} />
            <Route path="/minha-lista" element={<Watchlist />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/membros" element={<AdminMembers />} />
            <Route path="/admin/conteudos" element={<AdminContents />} />
            <Route path="/admin/webhooks" element={<AdminWebhooks />} />
            <Route path="/admin/adult" element={<AdminAdultAccess />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
