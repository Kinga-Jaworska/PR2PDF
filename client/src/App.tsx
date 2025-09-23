import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import RepositoriesPage from "@/pages/repositories";
import TemplatesPage from "@/pages/templates";
import ReportsPage from "@/pages/reports";
import PullRequestsPage from "@/pages/pull-requests";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/repositories" component={RepositoriesPage} />
        <Route path="/templates" component={TemplatesPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/pull-requests" component={PullRequestsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
