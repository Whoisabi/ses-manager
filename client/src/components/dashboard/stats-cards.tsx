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
      iconColor: "bg-blue-100 text-blue-600",
      trend: `${stats?.totalSent || 0} emails sent`,
      trendDirection: "up" as const,
      testId: "stat-total-sent"
    },
    {
      title: "Delivered",
      value: stats?.totalDelivered?.toLocaleString() || "0",
      icon: CheckCircle,
      iconColor: "bg-green-100 text-green-600",
      trend: `${deliveryRate}% delivery rate`,
      trendDirection: "up" as const,
      testId: "stat-delivered"
    },
    {
      title: "Clicks",
      value: stats?.totalClicked?.toLocaleString() || "0",
      icon: MousePointer,
      iconColor: "bg-orange-100 text-orange-600",
      trend: `${clickRate}% click rate`,
      trendDirection: "up" as const,
      testId: "stat-clicks"
    },
    {
      title: "Bounces",
      value: stats?.totalBounced?.toLocaleString() || "0",
      icon: AlertTriangle,
      iconColor: "bg-red-100 text-red-600",
      trend: `${bounceRate}% bounce rate`,
      trendDirection: "down" as const,
      testId: "stat-bounces"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trendDirection === "up" ? TrendingUp : TrendingDown;
        const trendColor = stat.trendDirection === "up" ? "text-green-600" : "text-red-600";
        
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-lg ${stat.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground" data-testid={stat.testId}>
                {stat.value}
              </div>
              <div className={`mt-4 flex items-center ${trendColor}`}>
                <TrendIcon className="w-3 h-3 mr-1" />
                <span className="text-sm">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
