import { useEffect, useState } from "react";
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
import { Upload, Users, FileText, Mail, Plus } from "lucide-react";
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
  from: z.string().email("Sender email is required and must be valid"),
});

export default function SendEmail() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [fromMode, setFromMode] = useState<"select" | "custom">("select");
  const [customPrefix, setCustomPrefix] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");

  const form = useForm<BulkSendForm>({
    resolver: zodResolver(bulkSendSchema),
    defaultValues: {
      subject: "",
      content: "",
      recipientListId: "",
      from: "",
    },
  });

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    enabled: !!user,
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    enabled: !!user,
  });

  // Fetch verified identities (domains and emails)
  const { data: identities, isLoading: loadingIdentities } = useQuery({
    queryKey: ["/api/ses/identities"],
    enabled: !!user,
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
      setCustomPrefix("");
      setSelectedDomain("");
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

  const handleTemplateSelect = (templateId: string) => {
    const template = (templates as any[])?.find((t: any) => t.id === templateId);
    if (template) {
      form.setValue("subject", template.subject);
      form.setValue("content", template.content);
    }
  };

  const handleBulkSend = (data: BulkSendForm) => {
    bulkSendMutation.mutate(data);
  }

  // Get verified domains and emails
  const verifiedIdentities = (identities as any)?.identities?.filter((i: any) => i.verified) || [];
  const verifiedDomains = verifiedIdentities.filter((i: any) => !i.identity.includes("@"));
  const verifiedEmails = verifiedIdentities.filter((i: any) => i.identity.includes("@"));

  // Handle custom domain email construction
  const handleCustomDomainChange = (domain: string) => {
    setSelectedDomain(domain);
    if (customPrefix) {
      form.setValue("from", `${customPrefix}@${domain}`);
    }
  };

  const handleCustomPrefixChange = (prefix: string) => {
    setCustomPrefix(prefix);
    if (selectedDomain) {
      form.setValue("from", `${prefix}@${selectedDomain}`);
    }
  };

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
                          name="from"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sender Email</FormLabel>
                              <Tabs value={fromMode} onValueChange={(v) => setFromMode(v as "select" | "custom")} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-3">
                                  <TabsTrigger value="select" data-testid="tab-bulk-select-verified">
                                    <Mail className="w-4 h-4 mr-2" />
                                    Verified Email
                                  </TabsTrigger>
                                  <TabsTrigger value="custom" data-testid="tab-bulk-custom-domain">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Custom Domain Email
                                  </TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="select" className="mt-0">
                                  <Select 
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                    }}
                                    value={field.value}
                                    disabled={loadingIdentities}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-bulk-from-email">
                                        <SelectValue placeholder={loadingIdentities ? "Loading..." : "Select verified email..."} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {verifiedEmails.length > 0 && (
                                        <>
                                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Verified Emails</div>
                                          {verifiedEmails.map((identity: any) => (
                                            <SelectItem key={identity.identity} value={identity.identity}>
                                              {identity.identity}
                                            </SelectItem>
                                          ))}
                                        </>
                                      )}
                                      {verifiedDomains.length > 0 && verifiedEmails.length > 0 && (
                                        <div className="h-px bg-border my-1" />
                                      )}
                                      {verifiedDomains.length > 0 && (
                                        <>
                                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Verified Domains (any email@domain)</div>
                                          {verifiedDomains.map((identity: any) => (
                                            <SelectItem key={identity.identity} value={`no-reply@${identity.identity}`}>
                                              Any email @ {identity.identity}
                                            </SelectItem>
                                          ))}
                                        </>
                                      )}
                                      {verifiedIdentities.length === 0 && (
                                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                          No verified emails or domains found. Please verify your domain first.
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </TabsContent>

                                <TabsContent value="custom" className="mt-0 space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                      <Label htmlFor="bulk-email-prefix" className="text-xs">Email Prefix</Label>
                                      <Input
                                        id="bulk-email-prefix"
                                        placeholder="support, no-reply, etc."
                                        value={customPrefix}
                                        onChange={(e) => handleCustomPrefixChange(e.target.value)}
                                        data-testid="input-bulk-email-prefix"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="bulk-domain-select" className="text-xs">Verified Domain</Label>
                                      <Select 
                                        value={selectedDomain}
                                        onValueChange={handleCustomDomainChange}
                                        disabled={verifiedDomains.length === 0}
                                      >
                                        <SelectTrigger id="bulk-domain-select" data-testid="select-bulk-custom-domain">
                                          <SelectValue placeholder={verifiedDomains.length === 0 ? "No domains" : "Select..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {verifiedDomains.map((identity: any) => (
                                            <SelectItem key={identity.identity} value={identity.identity}>
                                              {identity.identity}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  {customPrefix && selectedDomain && (
                                    <div className="bg-muted px-3 py-2 rounded-md">
                                      <p className="text-xs text-muted-foreground mb-1">Constructed Email:</p>
                                      <p className="font-mono text-sm font-medium">{customPrefix}@{selectedDomain}</p>
                                    </div>
                                  )}
                                </TabsContent>
                              </Tabs>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
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
