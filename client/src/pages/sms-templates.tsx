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
import { MessageSquare, Plus, Trash2, Edit } from "lucide-react";
import Header from "@/components/layout/header";

interface SmsTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  smsType: string;
  createdAt: string;
}

export default function SmsTemplates() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    smsType: "Promotional",
  });

  const { data: templates = [], isLoading } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/sms/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/templates"] });
      setOpen(false);
      resetForm();
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest(`/api/sms/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/templates"] });
      setOpen(false);
      resetForm();
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/sms/templates/${id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/templates"] });
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", message: "", smsType: "Promotional" });
    setEditingTemplate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      message: template.message,
      smsType: template.smsType,
    });
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">SMS Templates</h1>
            <p className="text-muted-foreground">Create and manage SMS message templates</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-template" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? "Edit" : "Create"} SMS Template</DialogTitle>
                  <DialogDescription>
                    {editingTemplate ? "Update" : "Create a new"} reusable SMS template
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      data-testid="input-template-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Welcome Message"
                      required
                    />
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
                  <Button type="submit" data-testid="button-save-template" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : "Save Template"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No SMS templates yet</p>
              <p className="text-muted-foreground mb-4">Create your first template to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} data-testid={`card-template-${template.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>
                        {template.smsType} • {new Date(template.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-edit-${template.id}`}
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-${template.id}`}
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this template?")) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{template.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{template.message.length} characters</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
