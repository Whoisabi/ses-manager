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
  Mail, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2,
  RefreshCw,
  Info,
  Send
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

export default function EmailVerification() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: identities, isLoading: identitiesLoading, refetch: refetchIdentities } = useQuery<{
    identities: Array<{
      identity: string;
      type: 'email' | 'domain';
      status: string;
    }>;
  }>({
    queryKey: ["/api/ses/identities"],
    enabled: !!user,
  });

  const addEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/ses/emails", { email });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verification Email Sent",
        description: data.message || "Please check your inbox for the verification link",
      });
      setIsAddDialogOpen(false);
      setNewEmail("");
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

  const deleteEmailMutation = useMutation({
    mutationFn: async (identity: string) => {
      const res = await apiRequest("DELETE", `/api/ses/identities/${encodeURIComponent(identity)}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Deleted",
        description: "The email address has been removed from AWS SES",
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

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/ses/emails", { email });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verification Email Resent",
        description: "Please check your inbox for the verification link",
      });
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

  const emails = identities?.identities?.filter(i => i.type === 'email') || [];

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

  const handleAddEmail = () => {
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    addEmailMutation.mutate(newEmail);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Email Verification" 
          description="Verify individual email addresses for sending"
        />
        
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Email Addresses</h2>
              <p className="text-muted-foreground">Manage your verified sender email addresses</p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-email">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Email Address</DialogTitle>
                  <DialogDescription>
                    Enter the email address you want to verify for sending emails
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="your-email@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <Button 
                    onClick={handleAddEmail} 
                    className="w-full"
                    disabled={addEmailMutation.isPending}
                    data-testid="button-submit-email"
                  >
                    {addEmailMutation.isPending ? "Sending..." : "Send Verification Email"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              After adding an email address, AWS SES will send a verification link to that address. 
              Click the link to verify ownership before you can send emails from it.
            </AlertDescription>
          </Alert>

          {identitiesLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading email addresses...</p>
            </div>
          ) : emails.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <h3 className="text-lg font-semibold mb-2">No Email Addresses Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Add your first email address to start sending emails
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-email">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {emails.map((email) => (
                <Card key={email.identity} data-testid={`card-email-${email.identity}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5" />
                        <div>
                          <CardTitle>{email.identity}</CardTitle>
                          <CardDescription>Email identity</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(email.status)}
                        {email.status === 'Pending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resendVerificationMutation.mutate(email.identity)}
                            disabled={resendVerificationMutation.isPending}
                            data-testid={`button-resend-${email.identity}`}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Resend
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" data-testid={`button-delete-${email.identity}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Email</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {email.identity}? 
                                You won't be able to send emails from this address anymore.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteEmailMutation.mutate(email.identity)}
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
                  {email.status === 'Pending' && (
                    <CardContent>
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          Verification email sent to {email.identity}. Please check your inbox and click the verification link. 
                          It may take a few minutes to arrive.
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
