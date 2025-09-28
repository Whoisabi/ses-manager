import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotebookPen, Save, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import RichTextEditor from "./rich-text-editor";
import type { QuickSendForm } from "@/lib/types";

const quickSendSchema = z.object({
  to: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  from: z.string().email("Please enter a valid from email address"),
});

interface EmailComposerProps {
  showHeader?: boolean;
}

export default function EmailComposer({ showHeader = true }: EmailComposerProps) {
  const { toast } = useToast();

  const form = useForm<QuickSendForm>({
    resolver: zodResolver(quickSendSchema),
    defaultValues: {
      to: "",
      subject: "",
      content: "",
      from: "",
    },
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

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleQuickSend)} className="space-y-4">
        <FormField
          control={form.control}
          name="from"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From</FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  placeholder="your-email@example.com"
                  data-testid="input-email-from"
                  {...field}
                />
              </FormControl>
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
