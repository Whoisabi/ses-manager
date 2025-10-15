import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  Trash2,
  RefreshCw,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Domains() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [newDomain, setNewDomain] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

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

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await apiRequest("POST", "/api/ses/domains", { domain });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Domain Added",
        description: `Verification started for ${data.domain}`,
      });
      setSelectedDomain(data);
      setIsAddDialogOpen(false);
      setNewDomain("");
      refetchIdentities();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (identity: string) => {
      const res = await apiRequest("DELETE", `/api/ses/identities/${encodeURIComponent(identity)}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Domain Deleted",
        description: "The domain has been removed from AWS SES",
      });
      refetchIdentities();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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

  const domains = identities?.identities?.filter(i => i.type === 'domain') || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Success') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    } else if (status === 'Pending') {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  const handleAddDomain = () => {
    if (!newDomain) {
      toast({
        title: "Error",
        description: "Please enter a domain name",
        variant: "destructive",
      });
      return;
    }
    addDomainMutation.mutate(newDomain);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Domain Management" 
          description="Verify domains to send emails from any address on that domain"
        />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Domains</h2>
              <p className="text-muted-foreground">Manage your verified sending domains</p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-domain">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Domain</DialogTitle>
                  <DialogDescription>
                    Enter the domain you want to verify for sending emails
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Input
                      placeholder="example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      data-testid="input-domain"
                    />
                  </div>
                  <Button 
                    onClick={handleAddDomain} 
                    className="w-full"
                    disabled={addDomainMutation.isPending}
                    data-testid="button-submit-domain"
                  >
                    {addDomainMutation.isPending ? "Adding..." : "Add Domain"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              After adding a domain, you'll need to add DNS records to verify ownership. 
              The records will be displayed below once you add a domain.
            </AlertDescription>
          </Alert>

          {identitiesLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading domains...</p>
            </div>
          ) : domains.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <h3 className="text-lg font-semibold mb-2">No Domains Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Add your first domain to start sending emails from any address on that domain
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-domain">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Domain
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <Card key={domain.identity} data-testid={`card-domain-${domain.identity}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5" />
                        <div>
                          <CardTitle>{domain.identity}</CardTitle>
                          <CardDescription>Domain identity</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(domain.status)}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" data-testid={`button-delete-${domain.identity}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {domain.identity}? 
                                You won't be able to send emails from this domain anymore.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDomainMutation.mutate(domain.identity)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  {domain.verificationToken && (
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">DNS Verification Record</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Add this TXT record to your DNS settings to verify domain ownership:
                        </p>
                        <div className="bg-muted p-3 rounded-md space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Name/Host:</p>
                              <code className="text-sm font-mono" data-testid={`txt-name-${domain.identity}`}>
                                _amazonses.{domain.identity}
                              </code>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyToClipboard(`_amazonses.${domain.identity}`)}
                              data-testid={`button-copy-name-${domain.identity}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Value:</p>
                              <code className="text-sm font-mono break-all" data-testid={`txt-value-${domain.identity}`}>
                                {domain.verificationToken}
                              </code>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyToClipboard(domain.verificationToken!)}
                              data-testid={`button-copy-value-${domain.identity}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Type: TXT</p>
                          </div>
                        </div>
                      </div>
                      
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          After adding the DNS record, it may take up to 72 hours for verification to complete. 
                          You can refresh this page to check the status.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
