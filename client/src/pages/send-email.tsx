import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailComposer from "@/components/email/email-composer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Users, FileText } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { BulkSendForm } from "@/lib/types";

const bulkSendSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  recipientListId: z.string().min(1, "Please select a recipient list"),
});

export default function SendEmail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const form = useForm<BulkSendForm>({
    resolver: zodResolver(bulkSendSchema),
    defaultValues: {
      subject: "",
      content: "",
      recipientListId: "",
    },
  });

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    enabled: isAuthenticated,
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    enabled: isAuthenticated,
  });

  const bulkSendMutation = useMutation({
    mutationFn: async (data: BulkSendForm) => {
      await apiRequest("POST", "/api/email/send-bulk", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bulk email campaign started successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/email-sends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
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
        description: error.message || "Failed to send bulk email",
        variant: "destructive",
      });
    },
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

  const handleTemplateSelect = (templateId: string) => {
    const template = (templates as any[])?.find((t: any) => t.id === templateId);
    if (template) {
      form.setValue("subject", template.subject);
      form.setValue("content", template.content);
    }
  };

  const handleBulkSend = (data: BulkSendForm) => {
    bulkSendMutation.mutate(data);
  };

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
          title="Send Email" 
          description="Compose and send emails to individual recipients or bulk lists"
        />
        
        <div className="p-6">
          <Tabs defaultValue="single" className="space-y-6">
            <TabsList data-testid="tabs-send-email">
              <TabsTrigger value="single" data-testid="tab-single-email">Single Email</TabsTrigger>
              <TabsTrigger value="bulk" data-testid="tab-bulk-email">Bulk Email</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Single Email
                  </CardTitle>
                  <CardDescription>
                    Send a single email to one or more recipients
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmailComposer showHeader={false} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="bulk">
              <div className="space-y-6">
                {/* Template Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Load Template (Optional)
                    </CardTitle>
                    <CardDescription>
                      Select a saved template to start with
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="template-select">Choose Template</Label>
                        <Select onValueChange={handleTemplateSelect} data-testid="select-template">
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(templates as any[])?.map((template: any) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bulk Email Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Bulk Email Campaign
                    </CardTitle>
                    <CardDescription>
                      Send personalized emails to a recipient list
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleBulkSend)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="recipientListId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recipient List</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                data-testid="select-recipient-list"
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select recipient list..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(recipientLists as any[])?.map((list: any) => (
                                    <SelectItem key={list.id} value={list.id}>
                                      {list.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter email subject..."
                                  data-testid="input-bulk-subject"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content</FormLabel>
                              <FormControl>
                                <div className="min-h-[300px] border rounded-md">
                                  {/* Note: In a real implementation, you'd use a rich text editor here */}
                                  <textarea
                                    className="w-full h-full min-h-[300px] p-3 border-0 resize-none focus:outline-none"
                                    placeholder="Enter your email content... You can use variables like {{firstName}}, {{lastName}}, {{email}}"
                                    data-testid="textarea-bulk-content"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="bg-muted p-4 rounded-md">
                          <h4 className="font-medium mb-2">Template Variables</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            You can use these variables in your subject and content:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <code className="bg-background px-2 py-1 rounded text-xs">{"{{firstName}}"}</code>
                            <code className="bg-background px-2 py-1 rounded text-xs">{"{{lastName}}"}</code>
                            <code className="bg-background px-2 py-1 rounded text-xs">{"{{email}}"}</code>
                            <span className="text-xs text-muted-foreground">+ any custom fields from CSV</span>
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={bulkSendMutation.isPending}
                          data-testid="button-send-bulk"
                        >
                          {bulkSendMutation.isPending ? (
                            <>
                              <Upload className="w-4 h-4 mr-2 animate-spin" />
                              Sending Campaign...
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 mr-2" />
                              Send Bulk Campaign
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
