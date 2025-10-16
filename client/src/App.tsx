import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/lib/protected-route";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login-page";
import SignupPage from "@/pages/signup-page";
import Dashboard from "@/pages/dashboard";
import SendEmail from "@/pages/send-email";
import Templates from "@/pages/templates";
import Recipients from "@/pages/recipients";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import SESDashboard from "@/pages/ses-dashboard";
import Domains from "@/pages/domains";
import EmailVerification from "@/pages/email-verification";
import ConfigurationSets from "@/pages/configuration-sets";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/" component={Landing} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/send-email" component={SendEmail} />
      <ProtectedRoute path="/templates" component={Templates} />
      <ProtectedRoute path="/recipients" component={Recipients} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/ses-dashboard" component={SESDashboard} />
      <ProtectedRoute path="/domains" component={Domains} />
      <ProtectedRoute path="/email-verification" component={EmailVerification} />
      <ProtectedRoute path="/configuration-sets" component={ConfigurationSets} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
