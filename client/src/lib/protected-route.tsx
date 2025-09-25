// Based on blueprint:javascript_auth_all_persistance - Protected route component
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element | null;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {(() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        
        if (!user) {
          return <Redirect to="/login" />;
        }
        
        return <Component />;
      })()}
    </Route>
  );
}