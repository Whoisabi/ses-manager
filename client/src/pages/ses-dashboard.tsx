import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Globe, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react";
import { Link } from "wouter";

export default function SESDashboard() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  const { data: identities, isLoading: identitiesLoading, refetch: refetchIdentities } = useQuery<{
    identities: Array<{
      identity: string;
      type: 'email' | 'domain';
      status: string;
      verificationToken?: string;
    }>;
  }>({
    queryKey: ["/api/ses/identities"],
    enabled: !!user,
  });

  const { data: quota, isLoading: quotaLoading } = useQuery<{
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  }>({
    queryKey: ["/api/ses/quota"],
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

  const verifiedIdentities = identities?.identities?.filter(i => i.status === 'Success') || [];
  const pendingIdentities = identities?.identities?.filter(i => i.status !== 'Success') || [];
  const verifiedDomains = verifiedIdentities.filter(i => i.type === 'domain');
  const verifiedEmails = verifiedIdentities.filter(i => i.type === 'email');

  const getStatusBadge = (status: string) => {
    if (status === 'Success') {
      return (
        <Badge variant="default" className="bg-green-500" data-testid={`badge-verified`}>
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (status === 'Pending') {
      return (
        <Badge variant="secondary" data-testid={`badge-pending`}>
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" data-testid={`badge-failed`}>
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="SES Dashboard" 
          description="Manage your AWS SES identities and monitor sending limits"
        />
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-quota">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  24-Hour Sending Limit
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotaLoading ? (
                  <div className="text-2xl font-bold">Loading...</div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold" data-testid="text-quota-limit">
                      {quota?.max24HourSend || 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {quota?.sentLast24Hours || 0} sent in last 24 hours
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-verified-domains">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Verified Domains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-domain-count">
                  {verifiedDomains.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active sending domains
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-verified-emails">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Verified Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-email-count">
                  {verifiedEmails.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Individual verified addresses
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Domain Identities
                    </CardTitle>
                    <CardDescription>
                      Verify domains to send from any email address on that domain
                    </CardDescription>
                  </div>
                  <Link href="/domains">
                    <Button size="sm" data-testid="button-manage-domains">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Domain
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {identitiesLoading ? (
                  <div className="text-center py-4">Loading identities...</div>
                ) : (
                  <div className="space-y-3">
                    {identities?.identities?.filter(i => i.type === 'domain').length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No domains verified yet</p>
                        <Link href="/domains">
                          <Button variant="link" size="sm" className="mt-2">
                            Add your first domain
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      identities?.identities
                        ?.filter(i => i.type === 'domain')
                        .slice(0, 5)
                        .map((identity) => (
                          <div 
                            key={identity.identity} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`domain-${identity.identity}`}
                          >
                            <div className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{identity.identity}</span>
                            </div>
                            {getStatusBadge(identity.status)}
                          </div>
                        ))
                    )}
                    {(identities?.identities?.filter(i => i.type === 'domain').length || 0) > 5 && (
                      <Link href="/domains">
                        <Button variant="link" size="sm" className="w-full">
                          View all domains
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email Identities
                    </CardTitle>
                    <CardDescription>
                      Verify individual email addresses for sending
                    </CardDescription>
                  </div>
                  <Link href="/email-verification">
                    <Button size="sm" data-testid="button-verify-email">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Email
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {identitiesLoading ? (
                  <div className="text-center py-4">Loading identities...</div>
                ) : (
                  <div className="space-y-3">
                    {identities?.identities?.filter(i => i.type === 'email').length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No emails verified yet</p>
                        <Link href="/email-verification">
                          <Button variant="link" size="sm" className="mt-2">
                            Verify your first email
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      identities?.identities
                        ?.filter(i => i.type === 'email')
                        .slice(0, 5)
                        .map((identity) => (
                          <div 
                            key={identity.identity} 
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`email-${identity.identity}`}
                          >
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{identity.identity}</span>
                            </div>
                            {getStatusBadge(identity.status)}
                          </div>
                        ))
                    )}
                    {(identities?.identities?.filter(i => i.type === 'email').length || 0) > 5 && (
                      <Link href="/email-verification">
                        <Button variant="link" size="sm" className="w-full">
                          View all emails
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {pendingIdentities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Verifications
                </CardTitle>
                <CardDescription>
                  These identities are waiting for verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingIdentities.map((identity) => (
                    <div 
                      key={identity.identity} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`pending-${identity.identity}`}
                    >
                      <div className="flex items-center gap-3">
                        {identity.type === 'domain' ? (
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{identity.identity}</span>
                      </div>
                      {getStatusBadge(identity.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
