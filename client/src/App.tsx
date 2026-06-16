import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import ClientsPage from "./pages/Clients";
import ClientDetailPage from "./pages/ClientDetail";
import CollaboratorsPage from "./pages/Collaborators";
import TasksPage from "./pages/Tasks";
import CalendarPage from "./pages/CalendarPage";
import ProductionPage from "./pages/Production";
import ReportsPage from "./pages/Reports";
import CollectionsPage from "./pages/Collections";
import { lazy, Suspense } from "react";

const FinancialPage = lazy(() => import("./pages/Financial"));

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/clientes" component={ClientsPage} />
        <Route path="/clientes/:id" component={ClientDetailPage} />
        <Route path="/colaboradores" component={CollaboratorsPage} />
        <Route path="/tarefas" component={TasksPage} />
        <Route path="/producao" component={ProductionPage} />
        <Route path="/calendario" component={CalendarPage} />
        <Route path="/cobrancas" component={CollectionsPage} />
        <Route path="/relatorios" component={ReportsPage} />
        <Route path="/financeiro">
          {() => (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>}>
              <FinancialPage />
            </Suspense>
          )}
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
