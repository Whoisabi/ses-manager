import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, MousePointer, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { EmailStats } from "@/lib/types";

export default function StatsCards() {
  const { data: stats } = useQuery<EmailStats>({
    queryKey: ["/api/analytics/stats"],
  });

  const deliveryRate = stats?.totalSent ? ((stats.totalDelivered / stats.totalSent) * 100).toFixed(1) : "0";
  const clickRate = stats?.totalDelivered ? ((stats.totalClicked / stats.totalDelivered) * 100).toFixed(1) : "0";
  const bounceRate = stats?.totalSent ? ((stats.totalBounced / stats.totalSent) * 100).toFixed(1) : "0";

  const statsCards = [
    {
      title: "Total Sent",
      value: stats?.totalSent?.toLocaleString() || "0",
      icon: Mail,
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      trend: `${stats?.totalSent || 0} emails sent`,
      trendDirection: "up" as const,
      trendColor: "text-green-600 dark:text-green-400",
      testId: "stat-total-sent"
    },
    {
      title: "Delivered",
      value: stats?.totalDelivered?.toLocaleString() || "0",
      icon: CheckCircle,
      gradient: "from-green-500 to-emerald-600",
      iconBg: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      trend: `${deliveryRate}% delivery rate`,
      trendDirection: "up" as const,
      trendColor: "text-green-600 dark:text-green-400",
      testId: "stat-delivered"
    },
    {
      title: "Clicks",
      value: stats?.totalClicked?.toLocaleString() || "0",
      icon: MousePointer,
      gradient: "from-orange-500 to-amber-600",
      iconBg: "bg-orange-50 dark:bg-orange-900/20",
      iconColor: "text-orange-600 dark:text-orange-400",
      trend: `${clickRate}% click rate`,
      trendDirection: "up" as const,
      trendColor: "text-green-600 dark:text-green-400",
      testId: "stat-clicks"
    },
    {
      title: "Bounces",
      value: stats?.totalBounced?.toLocaleString() || "0",
      icon: AlertTriangle,
      gradient: "from-red-500 to-rose-600",
      iconBg: "bg-red-50 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      trend: `${bounceRate}% bounce rate`,
      trendDirection: "down" as const,
      trendColor: "text-red-600 dark:text-red-400",
      testId: "stat-bounces"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trendDirection === "up" ? TrendingUp : TrendingDown;
        
        return (
          <Card 
            key={stat.title} 
            className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 dark:opacity-10`}></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${stat.iconBg} backdrop-blur-sm`}>
                <Icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold text-foreground tracking-tight" data-testid={stat.testId}>
                {stat.value}
              </div>
              <div className={`flex items-center gap-1.5 ${stat.trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
