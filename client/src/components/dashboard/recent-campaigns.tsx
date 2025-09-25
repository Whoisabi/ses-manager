import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function RecentCampaigns() {
  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: emailSends } = useQuery({
    queryKey: ["/api/email-sends"],
  });

  // Get recent campaigns with send counts
  const recentCampaigns = (campaigns as any[])?.slice(0, 5).map((campaign: any) => {
    const campaignSends = (emailSends as any[])?.filter((send: any) => send.campaignId === campaign.id) || [];
    const sentCount = campaignSends.length;
    const deliveredCount = campaignSends.filter((send: any) => send.status === 'delivered').length;
    
    return {
      ...campaign,
      sentCount,
      deliveredCount,
      status: campaign.status === 'sent' ? 'Delivered' : 
               campaign.status === 'sending' ? 'Sending' : 'Draft'
    };
  }) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Recent Campaigns</CardTitle>
          <Link href="/analytics">
            <Button variant="ghost" size="sm" data-testid="button-view-all-campaigns">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!campaigns || (campaigns as any[]).length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No campaigns yet</p>
            <Link href="/send-email">
              <Button variant="outline" size="sm" className="mt-2" data-testid="button-create-first-campaign">
                Create Your First Campaign
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentCampaigns.map((campaign: any) => (
              <div 
                key={campaign.id} 
                className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                data-testid={`campaign-item-${campaign.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground" data-testid={`campaign-name-${campaign.id}`}>
                      {campaign.name}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground" data-testid={`campaign-sent-${campaign.id}`}>
                    {campaign.sentCount > 0 ? `${campaign.sentCount} sent` : 'Not sent'}
                  </p>
                  <Badge 
                    variant={
                      campaign.status === 'Delivered' ? 'default' :
                      campaign.status === 'Sending' ? 'secondary' : 'outline'
                    }
                    className={
                      campaign.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'Sending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }
                    data-testid={`campaign-status-${campaign.id}`}
                  >
                    {campaign.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
