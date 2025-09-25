import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { EmailSendRecord } from "@/lib/types";

export default function EmailTrackingTable() {
  const { data: emailSends } = useQuery<EmailSendRecord[]>({
    queryKey: ["/api/email-sends"],
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      delivered: "bg-green-100 text-green-800",
      sent: "bg-blue-100 text-blue-800", 
      bounced: "bg-red-100 text-red-800",
      complained: "bg-red-100 text-red-800",
      failed: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
    } as const;

    return (
      <Badge 
        variant="secondary" 
        className={variants[status as keyof typeof variants] || variants.pending}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString() + ", " + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Email Tracking</CardTitle>
          <div className="flex space-x-2">
            <Select defaultValue="7days" data-testid="select-tracking-timeframe">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" data-testid="button-export-tracking">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!emailSends || emailSends.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No email tracking data available</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Subject</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Recipient</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sent</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Opened</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emailSends.slice(0, 10).map((send) => (
                    <tr 
                      key={send.id} 
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                      data-testid={`tracking-row-${send.id}`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground truncate max-w-[200px]" data-testid={`tracking-subject-${send.id}`}>
                          {send.subject}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-foreground" data-testid={`tracking-recipient-${send.id}`}>
                          {send.recipientEmail}
                        </p>
                      </td>
                      <td className="py-3 px-4" data-testid={`tracking-status-${send.id}`}>
                        {getStatusBadge(send.status)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-muted-foreground text-sm" data-testid={`tracking-sent-${send.id}`}>
                          {formatDate(send.sentAt)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-muted-foreground text-sm" data-testid={`tracking-opened-${send.id}`}>
                          {send.openedAt ? formatDate(send.openedAt) : "Not opened"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`tracking-view-${send.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {emailSends.length > 10 && (
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing 1 to 10 of {emailSends.length} results
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" data-testid="button-tracking-previous">
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                      1
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-tracking-next">
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
