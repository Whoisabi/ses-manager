import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Mail, Eye, MousePointer, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import type { EmailStats } from "@/lib/types";

export default function Analytics() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const { data: stats } = useQuery<EmailStats>({
    queryKey: ["/api/analytics/stats"],
    enabled: !!user,
  });

  const { data: emailSends } = useQuery({
    queryKey: ["/api/email-sends"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate rates
  const deliveryRate = stats?.totalSent ? ((stats.totalDelivered / stats.totalSent) * 100).toFixed(1) : "0";
  const openRate = stats?.totalDelivered ? ((stats.totalOpened / stats.totalDelivered) * 100).toFixed(1) : "0";
  const clickRate = stats?.totalOpened ? ((stats.totalClicked / stats.totalOpened) * 100).toFixed(1) : "0";
  const bounceRate = stats?.totalSent ? ((stats.totalBounced / stats.totalSent) * 100).toFixed(1) : "0";

  // Chart data
  const overviewData = [
    { name: "Sent", value: stats?.totalSent || 0, color: "#3b82f6" },
    { name: "Delivered", value: stats?.totalDelivered || 0, color: "#10b981" },
    { name: "Opened", value: stats?.totalOpened || 0, color: "#8b5cf6" },
    { name: "Clicked", value: stats?.totalClicked || 0, color: "#f59e0b" },
    { name: "Bounced", value: stats?.totalBounced || 0, color: "#ef4444" },
  ];

  const engagementData = [
    { name: "Delivered", value: stats?.totalDelivered || 0, color: "#10b981" },
    { name: "Opened", value: stats?.totalOpened || 0, color: "#8b5cf6" },
    { name: "Clicked", value: stats?.totalClicked || 0, color: "#f59e0b" },
    { name: "Bounced", value: stats?.totalBounced || 0, color: "#ef4444" },
    { name: "Complained", value: stats?.totalComplained || 0, color: "#dc2626" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Analytics" 
          description="Monitor your email campaign performance and engagement metrics"
          action={
            <div className="flex items-center space-x-2">
              <Select defaultValue="7days" data-testid="select-time-range">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          }
        />
        
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-sent">
                  {stats?.totalSent?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time email sends
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-delivery-rate">
                  {deliveryRate}%
                </div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                  {stats?.totalDelivered?.toLocaleString() || 0} delivered
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-open-rate">
                  {openRate}%
                </div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                  {stats?.totalOpened?.toLocaleString() || 0} opens
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-bounce-rate">
                  {bounceRate}%
                </div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
                  {stats?.totalBounced?.toLocaleString() || 0} bounces
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Volume Overview</CardTitle>
                <CardDescription>
                  Total email activity breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overviewData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Distribution</CardTitle>
                <CardDescription>
                  Email engagement breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={engagementData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {engagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key email performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Click-through Rate</span>
                  <span className="text-sm text-muted-foreground" data-testid="metric-ctr">
                    {clickRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Complaint Rate</span>
                  <span className="text-sm text-muted-foreground" data-testid="metric-complaint-rate">
                    {stats?.totalSent ? ((stats.totalComplained / stats.totalSent) * 100).toFixed(2) : "0"}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Clicks</span>
                  <span className="text-sm text-muted-foreground" data-testid="metric-total-clicks">
                    {stats?.totalClicked?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Complaints</span>
                  <span className="text-sm text-muted-foreground" data-testid="metric-total-complaints">
                    {stats?.totalComplained?.toLocaleString() || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest email sending activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!emailSends || (emailSends as any[]).length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(emailSends as any[]).slice(0, 5).map((send: any) => (
                      <div key={send.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{send.subject}</p>
                          <p className="text-xs text-muted-foreground">{send.recipientEmail}</p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            send.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            send.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            send.status === 'bounced' ? 'bg-red-100 text-red-800' :
                            send.status === 'complained' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {send.status}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {send.sentAt ? new Date(send.sentAt).toLocaleDateString() : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
