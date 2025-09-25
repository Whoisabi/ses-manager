import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Shield, Key, User, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import CredentialsModal from "@/components/aws/credentials-modal";
import { useState } from "react";

export default function Settings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);

  const { data: awsCredentials } = useQuery({
    queryKey: ["/api/aws/credentials"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Settings" 
          description="Manage your account and application settings"
        />
        
        <div className="p-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList data-testid="tabs-settings">
              <TabsTrigger value="profile" data-testid="tab-profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="aws" data-testid="tab-aws">
                <Shield className="w-4 h-4 mr-2" />
                AWS Credentials
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Your account information from your login provider
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                      {(user as any)?.profileImageUrl ? (
                        <img 
                          src={(user as any).profileImageUrl} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-full object-cover"
                          data-testid="img-profile"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-medium" data-testid="text-user-name">
                          {[(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(' ') || 'User'}
                        </h3>
                        <p className="text-muted-foreground" data-testid="text-user-email">
                          {(user as any)?.email || 'No email provided'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">User ID</label>
                        <p className="font-mono text-sm bg-muted p-2 rounded" data-testid="text-user-id">
                          {(user as any)?.id || 'Not available'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                        <p className="text-sm bg-muted p-2 rounded" data-testid="text-account-created">
                          {(user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'Not available'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = '/api/logout'}
                        data-testid="button-logout"
                      >
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="aws">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      AWS SES Credentials
                    </CardTitle>
                    <CardDescription>
                      Configure your AWS credentials to send emails through SES
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${(awsCredentials as any)?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-medium" data-testid="text-aws-status">
                            {(awsCredentials as any)?.connected ? 'AWS Connected' : 'AWS Not Connected'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(awsCredentials as any)?.connected 
                              ? `Region: ${(awsCredentials as any).region}` 
                              : 'Configure your AWS credentials to start sending emails'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(awsCredentials as any)?.connected && (
                          <Badge variant="secondary" data-testid="badge-aws-region">
                            {(awsCredentials as any).region}
                          </Badge>
                        )}
                        <Button 
                          onClick={() => setIsCredentialsModalOpen(true)}
                          data-testid="button-configure-aws"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          {(awsCredentials as any)?.connected ? 'Update Credentials' : 'Configure AWS'}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Security Information
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Your AWS credentials are encrypted and stored securely</li>
                        <li>• Credentials are never exposed to the frontend</li>
                        <li>• You can update or remove credentials at any time</li>
                        <li>• We recommend using IAM users with minimal SES permissions</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Required AWS Permissions
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Your AWS IAM user needs the following permissions:
                      </p>
                      <div className="bg-background p-3 rounded font-mono text-xs">
                        <div>• ses:SendEmail</div>
                        <div>• ses:SendBulkTemplatedEmail</div>
                        <div>• ses:CreateTemplate</div>
                        <div>• ses:DeleteTemplate</div>
                        <div>• ses:ListTemplates</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Usage & Limits</CardTitle>
                    <CardDescription>
                      Monitor your AWS SES usage and limits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <SettingsIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        Connect your AWS credentials to view usage statistics
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <CredentialsModal 
        open={isCredentialsModalOpen}
        onOpenChange={setIsCredentialsModalOpen}
      />
    </div>
  );
}
