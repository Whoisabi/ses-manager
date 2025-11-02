import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, CheckCircle2, XCircle, AlertCircle, Clock, Ban, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { EmailSendRecord } from "@/lib/types";

export default function EmailTrackingTable() {
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: emailSends } = useQuery<EmailSendRecord[]>({
    queryKey: ["/api/email-sends"],
  });

  const filteredEmailSends = useMemo(() => {
    if (!emailSends) return [];

    let filtered = emailSends;

    if (subjectFilter.trim()) {
      filtered = filtered.filter(send =>
        send.subject.toLowerCase().includes(subjectFilter.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "clicked") {
        filtered = filtered.filter(send => send.clickedAt !== null);
      } else if (statusFilter === "opened") {
        filtered = filtered.filter(send => send.openedAt !== null);
      } else {
        filtered = filtered.filter(send => send.status === statusFilter);
      }
    }

    return filtered;
  }, [emailSends, subjectFilter, statusFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      delivered: {
        variant: "default" as const,
        className: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-medium",
        icon: CheckCircle2
      },
      sent: {
        variant: "secondary" as const,
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-medium",
        icon: Clock
      },
      bounced: {
        variant: "destructive" as const,
        className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-medium",
        icon: AlertCircle
      },
      failed: {
        variant: "destructive" as const,
        className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 font-medium",
        icon: Ban
      },
      complained: {
        variant: "destructive" as const,
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20 font-medium",
        icon: AlertCircle
      },
      pending: {
        variant: "secondary" as const,
        className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 font-medium",
        icon: Clock
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge 
        variant={config.variant}
        className={`${config.className} flex items-center gap-1.5 px-3 py-1`}
      >
        <Icon className="w-3 h-3" />
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

  const getTrackingIcon = (timestamp?: string, type: string = 'check') => {
    if (timestamp) {
      return (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-green-500/10">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" data-testid={`icon-${type}-yes`} />
          </div>
        </div>
      );
    }
    return (
      <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
        <XCircle className="w-4 h-4 text-gray-400 dark:text-gray-600" data-testid={`icon-${type}-no`} />
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-background to-muted/20 dark:from-background dark:to-muted/10">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-bold">Email Tracking</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Monitor your email delivery and engagement</p>
          </div>
          <div className="flex space-x-2">
            <Select defaultValue="7days" data-testid="select-tracking-timeframe">
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-tracking">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!emailSends || emailSends.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">No email tracking data</p>
            <p className="text-sm text-muted-foreground mt-1">Send your first email to see tracking data here</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b bg-muted/10 dark:bg-muted/5">
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  Filters:
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by subject..."
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="pl-9"
                    data-testid="input-filter-subject"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44" data-testid="select-filter-status">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                {(subjectFilter || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSubjectFilter("");
                      setStatusFilter("all");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30 dark:bg-muted/10">
                    <th className="text-left py-4 px-6 font-semibold text-sm text-foreground uppercase tracking-wide">Subject</th>
                    <th className="text-left py-4 px-6 font-semibold text-sm text-foreground uppercase tracking-wide">Recipient</th>
                    <th className="text-left py-4 px-6 font-semibold text-sm text-foreground uppercase tracking-wide">Status</th>
                    <th className="text-center py-4 px-6 font-semibold text-sm text-foreground uppercase tracking-wide">Delivered</th>
                    <th className="text-center py-4 px-6 font-semibold text-sm text-foreground uppercase tracking-wide">Opened</th>
                    <th className="text-center py-4 px-6 font-semibold text-sm text-foreground uppercase tracking-wide">Clicked</th>
                    <th className="text-left py-4 px-6 font-semibold text-sm text-foreground uppercase tracking-wide">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmailSends.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <p className="text-muted-foreground">No emails match your filters</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setSubjectFilter("");
                            setStatusFilter("all");
                          }}
                          className="mt-2"
                        >
                          Clear filters
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredEmailSends.map((send, index) => (
                      <tr 
                        key={send.id} 
                        className={`border-b border-border hover:bg-accent/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                        data-testid={`tracking-row-${send.id}`}
                      >
                      <td className="py-4 px-6">
                        <p className="font-semibold text-foreground truncate max-w-[250px]" data-testid={`tracking-subject-${send.id}`}>
                          {send.subject}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-muted-foreground font-mono" data-testid={`tracking-recipient-${send.id}`}>
                          {send.recipientEmail}
                        </p>
                      </td>
                      <td className="py-4 px-6" data-testid={`tracking-status-${send.id}`}>
                        {getStatusBadge(send.status)}
                      </td>
                      <td className="py-4 px-6 text-center" data-testid={`tracking-delivered-${send.id}`}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          {getTrackingIcon(send.deliveredAt, 'delivered')}
                          {send.deliveredAt && <span className="text-xs text-muted-foreground font-medium">{formatDate(send.deliveredAt)}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center" data-testid={`tracking-opened-${send.id}`}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          {getTrackingIcon(send.openedAt, 'opened')}
                          {send.openedAt && <span className="text-xs text-muted-foreground font-medium">{formatDate(send.openedAt)}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center" data-testid={`tracking-clicked-${send.id}`}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          {getTrackingIcon(send.clickedAt, 'clicked')}
                          {send.clickedAt && <span className="text-xs text-muted-foreground font-medium">{formatDate(send.clickedAt)}</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-muted-foreground font-medium" data-testid={`tracking-sent-${send.id}`}>
                          {formatDate(send.sentAt)}
                        </p>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-muted/20 dark:bg-muted/10">
              <p className="text-sm text-muted-foreground font-medium">
                Showing {filteredEmailSends.length} of {emailSends.length} results
                {(subjectFilter || statusFilter !== "all") && (
                  <span className="ml-2 text-primary">(filtered)</span>
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
