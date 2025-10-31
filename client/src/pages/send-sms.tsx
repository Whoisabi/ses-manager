import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

export default function SendSms() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [inputMode, setInputMode] = useState<"dropdown" | "manual">("dropdown");
  const [formData, setFormData] = useState({
    phoneNumber: "",
    message: "",
    smsType: "Transactional",
    senderId: "",
  });

  const { data: awsSandboxNumbers = [], isLoading: sandboxLoading } = useQuery<Array<{
    phoneNumber: string;
    status: string;
  }>>({
    queryKey: ["/api/sms/aws-sandbox-numbers"],
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/sms/send", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "SMS sent successfully!" });
        setFormData({ phoneNumber: "", message: "", smsType: "Promotional", senderId: "" });
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
    if (formData.senderId && !/^[a-zA-Z0-9]{3,11}$/.test(formData.senderId)) {
      toast({
        title: "Invalid Sender ID",
        description: "Sender ID must be 3-11 alphanumeric characters",
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
                  <Label>Recipient Selection</Label>
                  <RadioGroup
                    value={inputMode}
                    onValueChange={(value: "dropdown" | "manual") => {
                      setInputMode(value);
                      setFormData({ ...formData, phoneNumber: "" });
                    }}
                    className="flex gap-4 mb-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dropdown" id="dropdown" />
                      <Label htmlFor="dropdown" className="font-normal cursor-pointer">
                        Select from verified numbers
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="manual" id="manual" />
                      <Label htmlFor="manual" className="font-normal cursor-pointer">
                        Enter manually
                      </Label>
                    </div>
                  </RadioGroup>

                  {inputMode === "dropdown" ? (
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      {sandboxLoading ? (
                        <div className="flex items-center gap-2 p-3 border rounded-md text-muted-foreground">
                          <Phone className="w-4 h-4 animate-pulse" />
                          <span className="text-sm">Loading verified numbers...</span>
                        </div>
                      ) : awsSandboxNumbers.length === 0 ? (
                        <Alert className="mt-2">
                          <AlertDescription className="text-sm">
                            No verified sandbox destination numbers found. Please verify phone numbers in your{" "}
                            <a 
                              href="https://console.aws.amazon.com/sns" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:underline"
                            >
                              AWS SNS Console
                            </a>{" "}
                            under "Sandbox destination phone numbers" or switch to manual entry.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Select
                            value={formData.phoneNumber}
                            onValueChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                          >
                            <SelectTrigger data-testid="select-phone-number" className="mt-1">
                              <SelectValue placeholder="Select a verified phone number" />
                            </SelectTrigger>
                            <SelectContent>
                              {awsSandboxNumbers
                                .filter(num => num.status === 'Verified')
                                .map((number) => (
                                  <SelectItem key={number.phoneNumber} value={number.phoneNumber}>
                                    {number.phoneNumber}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Choose from your AWS SNS verified sandbox destination numbers
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
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
                  )}
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
                  <Label htmlFor="senderId">Sender ID (Optional)</Label>
                  <Input
                    id="senderId"
                    data-testid="input-sender-id"
                    type="text"
                    value={formData.senderId}
                    onChange={(e) => setFormData({ ...formData, senderId: e.target.value.toUpperCase() })}
                    placeholder="MYCOMPANY"
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Custom alphanumeric sender name (3-11 characters). Only works in supported countries (not US/Canada).
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
