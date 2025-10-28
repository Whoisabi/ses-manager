import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

interface SmsCampaign {
  id: string;
  name: string;
  message: string;
  recipientListId: string | null;
  smsType: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
}

interface RecipientList {
  id: string;
  name: string;
}

export default function SmsCampaigns() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    recipientListId: "",
    smsType: "Promotional",
  });

  const { data: campaigns = [], isLoading } = useQuery<SmsCampaign[]>({
    queryKey: ["/api/sms/campaigns"],
  });

  const { data: recipientLists = [] } = useQuery<RecipientList[]>({
    queryKey: ["/api/recipient-lists"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/sms/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/campaigns"] });
      setOpen(false);
      resetForm();
      toast({ title: "Campaign created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await apiRequest(`/api/sms/campaigns/${campaignId}/send`, {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/campaigns"] });
      toast({
        title: "Campaign sent!",
        description: `Sent: ${data.totalSent}, Failed: ${data.totalFailed}`,
      });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to send campaign", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/sms/campaigns/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/campaigns"] });
      toast({ title: "Campaign deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", message: "", recipientListId: "", smsType: "Promotional" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="SMS Campaigns" 
          description="Send bulk SMS to recipient lists"
        />
        
        <div className="p-6">
        <div className="flex justify-end items-center mb-6">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-campaign" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create SMS Campaign</DialogTitle>
                  <DialogDescription>
                    Create a new bulk SMS campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      data-testid="input-campaign-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Summer Sale Announcement"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientList">Recipient List</Label>
                    <Select
                      value={formData.recipientListId}
                      onValueChange={(value) => setFormData({ ...formData, recipientListId: value })}
                      required
                    >
                      <SelectTrigger data-testid="select-recipient-list">
                        <SelectValue placeholder="Select a list" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipientLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="smsType">SMS Type</Label>
                    <Select
                      value={formData.smsType}
                      onValueChange={(value) => setFormData({ ...formData, smsType: value })}
                    >
                      <SelectTrigger data-testid="select-sms-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Promotional">Promotional</SelectItem>
                        <SelectItem value="Transactional">Transactional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="message">Message (max 160 chars)</Label>
                    <Textarea
                      id="message"
                      data-testid="input-message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Your SMS message here..."
                      maxLength={160}
                      rows={4}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {formData.message.length}/160 characters
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="button-save-campaign" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No SMS campaigns yet</p>
              <p className="text-muted-foreground mb-4">Create your first campaign to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} data-testid={`card-campaign-${campaign.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{campaign.name}</CardTitle>
                      <CardDescription>
                        {campaign.smsType} • {campaign.status === "sent" ? "Sent" : "Draft"}
                        {campaign.sentAt && ` • ${new Date(campaign.sentAt).toLocaleString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {campaign.status !== "sent" && (
                        <Button
                          data-testid={`button-send-${campaign.id}`}
                          onClick={() => {
                            if (confirm(`Send this campaign?`)) {
                              sendMutation.mutate(campaign.id);
                            }
                          }}
                          disabled={sendMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        data-testid={`button-delete-${campaign.id}`}
                        onClick={() => {
                          if (confirm("Delete this campaign?")) {
                            deleteMutation.mutate(campaign.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{campaign.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{campaign.message.length} characters</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
