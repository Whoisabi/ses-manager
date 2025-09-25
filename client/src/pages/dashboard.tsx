import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentCampaigns from "@/components/dashboard/recent-campaigns";
import EmailComposer from "@/components/email/email-composer";
import EmailTrackingTable from "@/components/tracking/email-tracking-table";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isLoading, error } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: error ? error.message : "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [user, isLoading, error, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">{error.message}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Dashboard" 
          description="Monitor your email campaigns and AWS SES usage"
        />
        
        <div className="p-6 space-y-6">
          <StatsCards />
          
          <QuickActions />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentCampaigns />
            <EmailComposer />
          </div>
          
          <EmailTrackingTable />
        </div>
      </main>
    </div>
  );
}
