
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ProofPage from "./pages/ProofPage";
import AuthPage from "./pages/AuthPage";
import AdminRules from "./pages/AdminRules";
import AuthTest from "./pages/AuthTest";
import TestCompliance from "./pages/TestCompliance";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import Policies from "./pages/Policies";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/rules" element={<AdminRules />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/test" element={<AuthTest />} />
            <Route path="/test-compliance" element={<TestCompliance />} />
            <Route path="/proof/:token" element={<ProofPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
