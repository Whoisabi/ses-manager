import { useEffect, useState } from "react";
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
import { MessageSquare, Phone, CheckCircle2, Clock, AlertCircle, Plus, Trash2, Info } from "lucide-react";

export default function SmsDashboard() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");

  const { data: smsStats } = useQuery<{
    totalSent: number;
    totalFailed: number;
    estimatedCost: number;
  }>({
    queryKey: ["/api/sms/stats"],
    enabled: !!user,
  });

  const { data: phoneNumbers = [], isLoading: phoneNumbersLoading, refetch: refetchPhoneNumbers } = useQuery<Array<{
    id: string;
    phoneNumber: string;
    status: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/sms/phone-numbers"],
    enabled: !!user,
  });

  const addPhoneNumberMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("/api/sms/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/phone-numbers"] });
      setIsAddDialogOpen(false);
      setNewPhoneNumber("");
      toast({
        title: "Phone Number Added",
        description: "Phone number has been added successfully.",
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

  const deletePhoneNumberMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/sms/phone-numbers/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/phone-numbers"] });
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

  const handleDeletePhoneNumber = (id: string, phoneNumber: string) => {
    if (confirm(`Are you sure you want to delete ${phoneNumber}?`)) {
      deletePhoneNumberMutation.mutate(id);
    }
  };

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
      <div className="flex h-screen items-center justify-center" data-testid="status-loading">
        <p data-testid="text-loading">Loading...</p>
      </div>
    );
  }

  const verifiedNumbers = phoneNumbers.filter(p => p.status === "verified");
  const pendingNumbers = phoneNumbers.filter(p => p.status === "pending");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="SMS Dashboard" 
          description="Manage your AWS SNS phone numbers and monitor SMS sending"
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
                  Verified Phone Numbers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-number-count">
                  {verifiedNumbers.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active sender numbers
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
              <h2 className="text-2xl font-bold">Sender Phone Numbers</h2>
              <p className="text-muted-foreground">Manage phone numbers for sending SMS</p>
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
                  <DialogTitle>Add Sender Phone Number</DialogTitle>
                  <DialogDescription>
                    Enter the phone number you want to use for sending SMS
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
                      Must be in E.164 format (e.g., +1234567890)
                    </p>
                  </div>
                  <Button 
                    onClick={handleAddPhoneNumber} 
                    className="w-full"
                    disabled={addPhoneNumberMutation.isPending}
                    data-testid="button-submit-phone"
                  >
                    {addPhoneNumberMutation.isPending ? "Adding..." : "Add Phone Number"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Add phone numbers that you own and want to use as sender IDs for your SMS campaigns. 
              Note: Some regions require pre-approved sender IDs through AWS SNS.
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
                <p className="text-lg font-semibold mb-2" data-testid="text-empty-title">No phone numbers yet</p>
                <p className="text-muted-foreground mb-4" data-testid="text-empty-description">Add your first phone number to start sending SMS</p>
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
                          ) : phoneNumber.status === "pending" ? (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {phoneNumber.status}
                            </>
                          )}
                        </Badge>
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
      </main>
    </div>
  );
}
