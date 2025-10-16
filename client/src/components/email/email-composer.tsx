import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotebookPen, Save, Upload, Plus, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import RichTextEditor from "./rich-text-editor";
import type { QuickSendForm, SESIdentitiesResponse, SESIdentity } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const quickSendSchema = z.object({
  to: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  from: z.string().email("Please enter a valid from email address"),
  configurationSetName: z.string().optional(),
});

interface EmailComposerProps {
  showHeader?: boolean;
}

export default function EmailComposer({ showHeader = true }: EmailComposerProps) {
  const { toast } = useToast();
  const [fromMode, setFromMode] = useState<"select" | "custom">("select");
  const [customPrefix, setCustomPrefix] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");

  const form = useForm<QuickSendForm>({
    resolver: zodResolver(quickSendSchema),
    defaultValues: {
      to: "",
      subject: "",
      content: "",
      from: "",
      configurationSetName: "",
    },
  });

  // Fetch verified identities (domains and emails)
  const { data: identities, isLoading: loadingIdentities } = useQuery<SESIdentitiesResponse>({
    queryKey: ["/api/ses/identities"],
  });

  // Fetch configuration sets
  const { data: configSets, isLoading: loadingConfigSets } = useQuery({
    queryKey: ["/api/ses/configuration-sets"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: QuickSendForm) => {
      await apiRequest("POST", "/api/email/send", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email sent successfully",
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
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const handleQuickSend = (data: QuickSendForm) => {
    sendEmailMutation.mutate(data);
  };

  // Get verified domains and emails
  const verifiedIdentities: SESIdentity[] = identities?.identities?.filter(i => i.verified) || [];
  const verifiedDomains = verifiedIdentities.filter(i => !i.identity.includes("@"));
  const verifiedEmails = verifiedIdentities.filter(i => i.identity.includes("@"));

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

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleQuickSend)} className="space-y-4">
        <FormField
          control={form.control}
          name="from"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sender Email</FormLabel>
              <Tabs value={fromMode} onValueChange={(v) => setFromMode(v as "select" | "custom")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="select" data-testid="tab-select-verified">
                    <Mail className="w-4 h-4 mr-2" />
                    Verified Email
                  </TabsTrigger>
                  <TabsTrigger value="custom" data-testid="tab-custom-domain">
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
                      <SelectTrigger data-testid="select-from-email">
                        <SelectValue placeholder={loadingIdentities ? "Loading..." : "Select verified email..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingIdentities && (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          Loading verified identities...
                        </div>
                      )}
                      {!loadingIdentities && verifiedEmails.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Verified Emails</div>
                          {verifiedEmails.map((identity) => (
                            <SelectItem key={identity.identity} value={identity.identity}>
                              {identity.identity}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {!loadingIdentities && verifiedDomains.length > 0 && verifiedEmails.length > 0 && (
                        <div className="h-px bg-border my-1" />
                      )}
                      {!loadingIdentities && verifiedDomains.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Verified Domains (any email@domain)</div>
                          {verifiedDomains.map((identity) => (
                            <SelectItem key={identity.identity} value={`no-reply@${identity.identity}`}>
                              Any email @ {identity.identity}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {!loadingIdentities && verifiedIdentities.length === 0 && (
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
                      <Label htmlFor="email-prefix" className="text-xs">Email Prefix</Label>
                      <Input
                        id="email-prefix"
                        placeholder="support, no-reply, etc."
                        value={customPrefix}
                        onChange={(e) => handleCustomPrefixChange(e.target.value)}
                        data-testid="input-email-prefix"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="domain-select" className="text-xs">Verified Domain</Label>
                      <Select 
                        value={selectedDomain}
                        onValueChange={handleCustomDomainChange}
                        disabled={verifiedDomains.length === 0}
                      >
                        <SelectTrigger id="domain-select" data-testid="select-custom-domain">
                          <SelectValue placeholder={verifiedDomains.length === 0 ? "No domains" : "Select..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingIdentities ? (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              Loading...
                            </div>
                          ) : verifiedDomains.length === 0 ? (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              No verified domains
                            </div>
                          ) : (
                            verifiedDomains.map((identity) => (
                              <SelectItem key={identity.identity} value={identity.identity}>
                                {identity.identity}
                              </SelectItem>
                            ))
                          )}
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
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter email subject"
                  data-testid="input-email-subject"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipients</FormLabel>
              <div className="flex space-x-2">
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="recipient@example.com"
                    className="flex-1"
                    data-testid="input-email-recipient"
                    {...field}
                  />
                </FormControl>
                <Button 
                  type="button" 
                  variant="outline"
                  data-testid="button-upload-recipients"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Enter your message..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="configurationSetName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Tracking (Optional)</FormLabel>
              <Select 
                onValueChange={field.onChange}
                value={field.value}
                disabled={loadingConfigSets}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-single-email-config-set">
                    <SelectValue placeholder={loadingConfigSets ? "Loading..." : "Select configuration set..."} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none" data-testid="select-item-none">No tracking</SelectItem>
                  {!loadingConfigSets && (configSets as any[])?.map((configSet: any) => (
                    <SelectItem 
                      key={configSet.id} 
                      value={configSet.name}
                      data-testid={`select-item-config-${configSet.id}`}
                    >
                      {configSet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex space-x-3">
          <Button 
            type="submit"
            className="flex-1"
            disabled={sendEmailMutation.isPending}
            data-testid="button-send-email"
          >
            {sendEmailMutation.isPending ? (
              <>
                <NotebookPen className="w-4 h-4 mr-2 animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                <NotebookPen className="w-4 h-4 mr-2" />
                Send Now
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            data-testid="button-save-draft"
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Form>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Send</CardTitle>
        <CardDescription>
          Send a quick email to one or more recipients
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
