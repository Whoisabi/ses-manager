import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, CheckCircle2, Clock, Plus, Trash2, Info, Send, ShieldCheck } from "lucide-react";

export default function SmsDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");

  const { data: smsStats } = useQuery<{
    totalSent: number;
    totalFailed: number;
    estimatedCost: number;
  }>({
    queryKey: ["/api/sms/stats"],
    enabled: !!user,
  });

  const { data: phoneNumbers = [], isLoading: phoneNumbersLoading } = useQuery<Array<{
    id: string;
    phoneNumber: string;
    status: string;
    verifiedAt: string | null;
    createdAt: string;
  }>>({
    queryKey: ["/api/sms/recipient-phone-numbers"],
    enabled: !!user,
  });

  const addPhoneNumberMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("POST", "/api/sms/recipient-phone-numbers", { phoneNumber });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/recipient-phone-numbers"] });
      setIsAddDialogOpen(false);
      setNewPhoneNumber("");
      toast({
        title: "Phone Number Added",
        description: "A verification code has been sent to the phone number.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add phone number",
        variant: "destructive",
      });
    },
  });

  const sendVerificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/sms/recipient-phone-numbers/${id}/send-verification`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Code Sent",
        description: "A new verification code has been sent to your phone.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const verifyPhoneNumberMutation = useMutation({
    mutationFn: async ({ id, code }: { id: string; code: string }) => {
      const response = await apiRequest("POST", `/api/sms/recipient-phone-numbers/${id}/verify`, { code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/recipient-phone-numbers"] });
      setIsVerifyDialogOpen(false);
      setVerificationCode("");
      setSelectedPhoneId("");
      toast({
        title: "Phone Number Verified",
        description: "Phone number has been verified successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  const deletePhoneNumberMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/sms/recipient-phone-numbers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/recipient-phone-numbers"] });
      toast({
        title: "Phone Number Deleted",
        description: "Phone number has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete phone number",
        variant: "destructive",
      });
    },
  });

  const handleAddPhoneNumber = () => {
    if (!newPhoneNumber.startsWith("+")) {
      toast({
        title: "Invalid Format",
        description: "Phone number must be in E.164 format (e.g., +1234567890)",
        variant: "destructive",
      });
      return;
    }
    addPhoneNumberMutation.mutate(newPhoneNumber);
  };

  const handleVerifyPhoneNumber = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    verifyPhoneNumberMutation.mutate({ id: selectedPhoneId, code: verificationCode });
  };

  const openVerifyDialog = (id: string) => {
    setSelectedPhoneId(id);
    setVerificationCode("");
    setIsVerifyDialogOpen(true);
  };

  const handleDeletePhoneNumber = (id: string, phoneNumber: string) => {
    if (confirm(`Are you sure you want to delete ${phoneNumber}?`)) {
      deletePhoneNumberMutation.mutate(id);
    }
  };

  const verifiedNumbers = phoneNumbers.filter(p => p.status === "verified");
  const pendingNumbers = phoneNumbers.filter(p => p.status === "pending");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="SMS Dashboard" 
          description="Manage recipient phone numbers and verify them for SMS campaigns"
        />
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-sms-sent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total SMS Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-sms-sent">
                  {smsStats?.totalSent || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {smsStats?.totalFailed || 0} failed
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-verified-numbers">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Verified Recipients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-number-count">
                  {verifiedNumbers.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingNumbers.length} pending verification
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-estimated-cost">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estimated Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-estimated-cost">
                  ${(smsStats?.estimatedCost || 0).toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on sent messages
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Recipient Phone Numbers</h2>
              <p className="text-muted-foreground">Add and verify recipient phone numbers for SMS campaigns</p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-phone">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Phone Number
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Recipient Phone Number</DialogTitle>
                  <DialogDescription>
                    Add a phone number to send SMS campaigns. A verification code will be sent automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+1234567890"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      data-testid="input-phone-number"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Must be in E.164 format (includes country code with +)
                    </p>
                  </div>
                  <Button 
                    onClick={handleAddPhoneNumber} 
                    className="w-full"
                    disabled={addPhoneNumberMutation.isPending || !newPhoneNumber}
                    data-testid="button-submit-phone"
                  >
                    {addPhoneNumberMutation.isPending ? "Adding & Sending Code..." : "Add Phone Number"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">How recipient phone number verification works:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click "Add Phone Number" and enter a phone number in E.164 format</li>
                  <li>A 6-digit verification code will be sent via SMS to that number</li>
                  <li>Click "Verify" on the phone number card and enter the code</li>
                  <li>Once verified, you can send SMS campaigns to this recipient</li>
                  <li>You can resend the verification code if needed</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-2">
                  Note: You need AWS SNS configured with sender phone numbers to send verification codes.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {phoneNumbersLoading ? (
            <div className="text-center py-8" data-testid="status-loading-numbers">
              <p className="text-muted-foreground" data-testid="text-loading-numbers">Loading phone numbers...</p>
            </div>
          ) : phoneNumbers.length === 0 ? (
            <Card data-testid="card-empty-state">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Phone className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2" data-testid="text-empty-title">No recipient phone numbers yet</p>
                <p className="text-muted-foreground mb-4" data-testid="text-empty-description">Add your first recipient phone number to start sending SMS campaigns</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {phoneNumbers.map((phoneNumber) => (
                <Card key={phoneNumber.id} data-testid={`card-phone-${phoneNumber.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{phoneNumber.phoneNumber}</CardTitle>
                          <CardDescription>
                            Added {new Date(phoneNumber.createdAt).toLocaleDateString()}
                            {phoneNumber.verifiedAt && ` • Verified ${new Date(phoneNumber.verifiedAt).toLocaleDateString()}`}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={phoneNumber.status === "verified" ? "default" : "secondary"}>
                          {phoneNumber.status === "verified" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                        {phoneNumber.status !== "verified" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendVerificationMutation.mutate(phoneNumber.id)}
                              disabled={sendVerificationMutation.isPending}
                              data-testid={`button-resend-${phoneNumber.id}`}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Resend Code
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openVerifyDialog(phoneNumber.id)}
                              data-testid={`button-verify-${phoneNumber.id}`}
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verify
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-${phoneNumber.id}`}
                          onClick={() => handleDeletePhoneNumber(phoneNumber.id, phoneNumber.phoneNumber)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Phone Number</DialogTitle>
              <DialogDescription>
                Enter the 6-digit verification code sent to your phone number
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  data-testid="input-verification-code"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 6-digit code you received via SMS
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleVerifyPhoneNumber} 
                  className="flex-1"
                  disabled={verifyPhoneNumberMutation.isPending || verificationCode.length !== 6}
                  data-testid="button-submit-verification"
                >
                  {verifyPhoneNumberMutation.isPending ? "Verifying..." : "Verify Phone Number"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsVerifyDialogOpen(false);
                    setVerificationCode("");
                  }}
                  data-testid="button-cancel-verification"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
