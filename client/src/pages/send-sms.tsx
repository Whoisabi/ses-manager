import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

export default function SendSms() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    phoneNumber: "",
    message: "",
    smsType: "Promotional",
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "SMS sent successfully!" });
        setFormData({ phoneNumber: "", message: "", smsType: "Promotional" });
      } else {
        toast({ title: `Failed to send SMS: ${data.error}`, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to send SMS", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phoneNumber.startsWith("+")) {
      toast({
        title: "Invalid phone number",
        description: "Phone number must be in E.164 format (e.g., +1234567890)",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate(formData);
  };

  const characterCount = formData.message.length;
  const segments = Math.ceil(characterCount / 160);
  const estimatedCost = (segments * 0.00645).toFixed(4);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Send SMS" 
          description="Send a single SMS message"
        />
        
        <div className="p-6">
          <div className="max-w-2xl mx-auto">

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Compose SMS
              </CardTitle>
              <CardDescription>
                Enter the recipient's phone number and your message
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    data-testid="input-phone"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+1234567890"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be in E.164 format (e.g., +1234567890)
                  </p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Transactional SMS has better delivery for OTPs and alerts
                  </p>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    data-testid="input-message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Your SMS message here..."
                    rows={6}
                    required
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{characterCount} characters • {segments} segment{segments > 1 ? "s" : ""}</span>
                    <span>Est. cost: ${estimatedCost}</span>
                  </div>
                  {characterCount > 160 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Messages over 160 characters will be sent as {segments} segments and cost ${estimatedCost}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  data-testid="button-send"
                  disabled={sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send SMS
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Tips for SMS Messaging</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Keep messages under 160 characters to avoid multiple charges</p>
              <p>• Use Transactional type for OTPs and critical notifications</p>
              <p>• Use Promotional type for marketing messages</p>
              <p>• Phone numbers must be in E.164 format (+[country code][number])</p>
              <p>• Rate limit: 1 SMS per minute per phone number</p>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
