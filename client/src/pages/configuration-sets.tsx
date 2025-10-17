import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Settings, Eye, MousePointer, Activity } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { isUnauthorizedError } from "@/lib/authUtils";

const configSetSchema = z.object({
  name: z.string().min(1, "Configuration set name is required"),
  openTrackingEnabled: z.boolean().default(true),
  clickTrackingEnabled: z.boolean().default(true),
});

type ConfigSetForm = z.infer<typeof configSetSchema>;

export default function ConfigurationSets() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ConfigSetForm>({
    resolver: zodResolver(configSetSchema),
    defaultValues: {
      name: "",
      openTrackingEnabled: true,
      clickTrackingEnabled: true,
    },
  });

  const { data: configSets, isLoading: loadingSets } = useQuery({
    queryKey: ["/api/ses/configuration-sets"],
    enabled: !!user,
  });

  const createConfigSetMutation = useMutation({
    mutationFn: async (data: ConfigSetForm) => {
      await apiRequest("POST", "/api/ses/configuration-sets", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Configuration set created successfully",
      });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/ses/configuration-sets"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to create configuration set",
        variant: "destructive",
      });
    },
  });

  const deleteConfigSetMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("DELETE", `/api/ses/configuration-sets/${name}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Configuration set deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ses/configuration-sets"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete configuration set",
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

  const handleCreate = (data: ConfigSetForm) => {
    createConfigSetMutation.mutate(data);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Configuration Sets" 
          description="Manage email tracking configuration sets for AWS SES"
        />
        
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Email Tracking Configuration</CardTitle>
                <CardDescription>
                  Configuration sets enable email open and click tracking through AWS SES and SNS
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-config-set">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Configuration Set
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Configuration Set</DialogTitle>
                    <DialogDescription>
                      Set up email tracking with automatic SNS topic creation and webhook subscription
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Configuration Set Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., email-tracking-prod" 
                                {...field}
                                data-testid="input-config-set-name"
                              />
                            </FormControl>
                            <FormDescription>
                              SNS topic and webhook will be automatically created for you
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4">
                        <Label>Tracking Options</Label>
                        
                        <FormField
                          control={form.control}
                          name="openTrackingEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  Open Tracking
                                </FormLabel>
                                <FormDescription>
                                  Track when recipients open your emails
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-open-tracking-enabled"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="clickTrackingEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base flex items-center gap-2">
                                  <MousePointer className="w-4 h-4" />
                                  Click Tracking
                                </FormLabel>
                                <FormDescription>
                                  Track when recipients click links in your emails
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-click-tracking-enabled"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          data-testid="button-cancel-config-set"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createConfigSetMutation.isPending}
                          data-testid="button-submit-config-set"
                        >
                          {createConfigSetMutation.isPending ? "Creating..." : "Create Configuration Set"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            
            <CardContent>
              {loadingSets ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading configuration sets...
                </div>
              ) : !configSets || (configSets as any[]).length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Settings className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold">No configuration sets</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first configuration set to enable email tracking
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(configSets as any[]).map((configSet: any) => (
                    <Card key={configSet.id} className="border-2">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <CardTitle className="text-lg" data-testid={`text-config-name-${configSet.id}`}>
                                {configSet.name}
                              </CardTitle>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                Active
                              </Badge>
                            </div>
                            <CardDescription className="font-mono text-xs" data-testid={`text-sns-arn-${configSet.id}`}>
                              SNS Topic: {configSet.snsTopicArn}
                            </CardDescription>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConfigSetMutation.mutate(configSet.name)}
                            disabled={deleteConfigSetMutation.isPending}
                            data-testid={`button-delete-config-${configSet.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <Eye className={`w-4 h-4 ${configSet.openTrackingEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className={`text-sm ${configSet.openTrackingEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {configSet.openTrackingEnabled ? 'Open Tracking: Enabled' : 'Open Tracking: Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MousePointer className={`w-4 h-4 ${configSet.clickTrackingEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className={`text-sm ${configSet.clickTrackingEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {configSet.clickTrackingEnabled ? 'Click Tracking: Enabled' : 'Click Tracking: Disabled'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to enable email tracking in AWS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                    1
                  </Badge>
                  <div>
                    <p className="font-medium">Create SNS Topic in AWS</p>
                    <p className="text-sm text-muted-foreground">
                      Go to AWS SNS console and create a new topic for SES event notifications
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                    2
                  </Badge>
                  <div>
                    <p className="font-medium">Subscribe Webhook to SNS Topic</p>
                    <p className="text-sm text-muted-foreground">
                      Add this webhook URL as an HTTPS subscription to your SNS topic:
                    </p>
                    <code className="block mt-2 p-2 bg-muted rounded text-sm font-mono break-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/sns` : '/api/webhooks/sns'}
                    </code>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                    3
                  </Badge>
                  <div>
                    <p className="font-medium">Create Configuration Set</p>
                    <p className="text-sm text-muted-foreground">
                      Use the form above to create a configuration set with your SNS topic ARN
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                    4
                  </Badge>
                  <div>
                    <p className="font-medium">Use Configuration Set When Sending</p>
                    <p className="text-sm text-muted-foreground">
                      Select the configuration set when sending emails to enable tracking
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
