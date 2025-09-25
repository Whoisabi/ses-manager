import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { AwsCredentialsForm } from "@/lib/types";

const credentialsSchema = z.object({
  region: z.string().min(1, "Region is required"),
  encryptedAccessKey: z.string().min(1, "Access Key ID is required"),
  encryptedSecretKey: z.string().min(1, "Secret Access Key is required"),
});

interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AWS_REGIONS = [
  { value: "us-east-1", label: "us-east-1 (N. Virginia)" },
  { value: "us-west-2", label: "us-west-2 (Oregon)" },
  { value: "eu-west-1", label: "eu-west-1 (Ireland)" },
  { value: "ap-southeast-1", label: "ap-southeast-1 (Singapore)" },
  { value: "ap-northeast-1", label: "ap-northeast-1 (Tokyo)" },
  { value: "eu-central-1", label: "eu-central-1 (Frankfurt)" },
];

export default function CredentialsModal({ open, onOpenChange }: CredentialsModalProps) {
  const { toast } = useToast();
  const [saveCredentials, setSaveCredentials] = useState(true);

  const form = useForm<AwsCredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      region: "",
      encryptedAccessKey: "",
      encryptedSecretKey: "",
    },
  });

  const { data: existingCredentials } = useQuery({
    queryKey: ["/api/aws/credentials"],
    enabled: open,
  });

  const validateMutation = useMutation({
    mutationFn: async (data: AwsCredentialsForm) => {
      const response = await apiRequest("POST", "/api/aws/credentials/validate", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        // If validation succeeds, save the credentials
        saveCredentialsMutation.mutate(form.getValues());
      } else {
        toast({
          title: "Invalid Credentials",
          description: "The provided AWS credentials are invalid. Please check and try again.",
          variant: "destructive",
        });
      }
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
        title: "Validation Error",
        description: error.message || "Failed to validate AWS credentials",
        variant: "destructive",
      });
    },
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async (data: AwsCredentialsForm) => {
      await apiRequest("POST", "/api/aws/credentials", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AWS credentials saved and validated successfully",
      });
      form.reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/aws/credentials"] });
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
        description: error.message || "Failed to save AWS credentials",
        variant: "destructive",
      });
    },
  });

  const deleteCredentialsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/aws/credentials");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AWS credentials removed successfully",
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/aws/credentials"] });
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
        description: error.message || "Failed to remove AWS credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AwsCredentialsForm) => {
    validateMutation.mutate(data);
  };

  const handleDeleteCredentials = () => {
    if (confirm("Are you sure you want to remove your AWS credentials? This will disable email sending.")) {
      deleteCredentialsMutation.mutate();
    }
  };

  const isLoading = validateMutation.isPending || saveCredentialsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            AWS Credentials
          </DialogTitle>
          <DialogDescription>
            {(existingCredentials as any)?.connected 
              ? "Update your AWS SES credentials"
              : "Configure your AWS SES credentials to start sending emails"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AWS Region</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    data-testid="select-aws-region"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AWS region..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AWS_REGIONS.map((region) => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
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
              name="encryptedAccessKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key ID</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      placeholder="AKIA..."
                      data-testid="input-access-key"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="encryptedSecretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Access Key</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Enter secret key"
                      data-testid="input-secret-key"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="saveCredentials" 
                checked={saveCredentials}
                onCheckedChange={(checked) => setSaveCredentials(!!checked)}
                data-testid="checkbox-save-credentials"
              />
              <Label htmlFor="saveCredentials" className="text-sm">
                Save credentials securely (encrypted)
              </Label>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Your AWS credentials are encrypted and stored securely. They are never exposed to the frontend.
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-credentials"
              >
                Cancel
              </Button>
              
              {(existingCredentials as any)?.connected && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteCredentials}
                  disabled={deleteCredentialsMutation.isPending}
                  data-testid="button-delete-credentials"
                >
                  Remove
                </Button>
              )}
              
              <Button 
                type="submit"
                disabled={isLoading}
                className="flex-1"
                data-testid="button-save-credentials"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {validateMutation.isPending ? "Validating..." : "Saving..."}
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
