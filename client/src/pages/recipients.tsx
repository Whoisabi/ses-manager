import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Users, FileText, Calendar, Mail } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RecipientListForm } from "@/lib/types";

const recipientListSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
});

export default function Recipients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedList, setSelectedList] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const form = useForm<RecipientListForm>({
    resolver: zodResolver(recipientListSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { data: recipientLists } = useQuery({
    queryKey: ["/api/recipient-lists"],
    enabled: isAuthenticated,
  });

  const { data: recipients } = useQuery({
    queryKey: ["/api/recipient-lists", selectedList?.id, "recipients"],
    enabled: isAuthenticated && !!selectedList?.id,
  });

  const createListMutation = useMutation({
    mutationFn: async (data: RecipientListForm) => {
      await apiRequest("POST", "/api/recipient-lists", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recipient list created successfully",
      });
      form.reset();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create recipient list",
        variant: "destructive",
      });
    },
  });

  const uploadRecipientsMutation = useMutation({
    mutationFn: async ({ listId, file }: { listId: string; file: File }) => {
      const formData = new FormData();
      formData.append('csv', file);
      
      const response = await fetch(`/api/recipient-lists/${listId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Recipients uploaded successfully",
      });
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/recipient-lists", selectedList?.id, "recipients"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to upload recipients",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleCreateList = (data: RecipientListForm) => {
    createListMutation.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setUploadFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleUploadRecipients = () => {
    if (!selectedList || !uploadFile) return;
    
    uploadRecipientsMutation.mutate({
      listId: selectedList.id,
      file: uploadFile,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <Header 
          title="Recipients" 
          description="Manage your recipient lists and contacts"
          action={
            <Dialog 
              open={isDialogOpen} 
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  form.reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button data-testid="button-create-list">
                  <Plus className="w-4 h-4 mr-2" />
                  New List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Recipient List</DialogTitle>
                  <DialogDescription>
                    Create a new list to organize your email recipients
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateList)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>List Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter list name..."
                              data-testid="input-list-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter list description..."
                              data-testid="textarea-list-description"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel-list"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createListMutation.isPending}
                        data-testid="button-save-list"
                      >
                        Create List
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          }
        />
        
        <div className="p-6">
          <Tabs defaultValue="lists" className="space-y-6">
            <TabsList data-testid="tabs-recipients">
              <TabsTrigger value="lists" data-testid="tab-lists">Recipient Lists</TabsTrigger>
              <TabsTrigger value="manage" data-testid="tab-manage">Manage Recipients</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lists">
              {!recipientLists || (recipientLists as any[]).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No recipient lists yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first recipient list to organize your contacts
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-list">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First List
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(recipientLists as any[]).map((list: any) => (
                    <Card 
                      key={list.id} 
                      className={`hover:shadow-md transition-shadow cursor-pointer ${
                        selectedList?.id === list.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedList(list)}
                      data-testid={`card-list-${list.id}`}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg" data-testid={`text-list-name-${list.id}`}>
                          {list.name}
                        </CardTitle>
                        {list.description && (
                          <CardDescription data-testid={`text-list-description-${list.id}`}>
                            {list.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="w-4 h-4 mr-2" />
                            <span>Click to view recipients</span>
                          </div>
                          
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(list.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="manage">
              {!selectedList ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a recipient list</h3>
                    <p className="text-muted-foreground text-center">
                      Choose a recipient list from the Lists tab to manage recipients
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Upload Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Upload Recipients to "{selectedList.name}"
                      </CardTitle>
                      <CardDescription>
                        Upload a CSV file with recipient information
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="csv-upload">Choose CSV File</Label>
                          <Input
                            id="csv-upload"
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            data-testid="input-csv-upload"
                          />
                        </div>
                        
                        {uploadFile && (
                          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <span className="text-sm">{uploadFile.name}</span>
                            <Button
                              onClick={handleUploadRecipients}
                              disabled={uploadRecipientsMutation.isPending}
                              data-testid="button-upload-csv"
                            >
                              {uploadRecipientsMutation.isPending ? (
                                <>
                                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        
                        <div className="bg-muted p-4 rounded-md">
                          <h4 className="font-medium mb-2">CSV Format Requirements</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Required column: <code>email</code></li>
                            <li>• Optional columns: <code>firstName</code>, <code>lastName</code></li>
                            <li>• Any additional columns will be stored as custom metadata</li>
                            <li>• First row should contain column headers</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recipients Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recipients in "{selectedList.name}"</CardTitle>
                      <CardDescription>
                        {(recipients as any[])?.length || 0} recipients
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!recipients || (recipients as any[]).length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No recipients in this list</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 font-medium text-muted-foreground">Email</th>
                                <th className="text-left py-2 font-medium text-muted-foreground">Name</th>
                                <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                                <th className="text-left py-2 font-medium text-muted-foreground">Added</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(recipients as any[]).map((recipient: any) => (
                                <tr key={recipient.id} className="border-b border-border">
                                  <td className="py-3" data-testid={`text-email-${recipient.id}`}>
                                    {recipient.email}
                                  </td>
                                  <td className="py-3" data-testid={`text-name-${recipient.id}`}>
                                    {[recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || '-'}
                                  </td>
                                  <td className="py-3">
                                    <Badge 
                                      variant={recipient.isActive ? "default" : "secondary"}
                                      data-testid={`status-${recipient.id}`}
                                    >
                                      {recipient.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </td>
                                  <td className="py-3 text-muted-foreground text-sm">
                                    {new Date(recipient.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
