import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EmailValidationResult {
  email: string;
  isValid: boolean;
  reason?: string;
}

interface SanitizationResults {
  validEmails: string[];
  invalidEmails: EmailValidationResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

export default function SanitizeEmails() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [emailText, setEmailText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [results, setResults] = useState<SanitizationResults | null>(null);
  const [options, setOptions] = useState({
    checkFormat: true,
    checkDisposable: true,
    checkMx: true,
    removeDuplicates: true,
  });

  const sanitizeMutation = useMutation({
    mutationFn: async ({ emails, file }: { emails?: string; file?: File }) => {
      const formData = new FormData();
      
      if (file) {
        formData.append('csv', file);
      } else if (emails) {
        formData.append('emails', emails);
      }
      
      formData.append('checkFormat', String(options.checkFormat));
      formData.append('checkDisposable', String(options.checkDisposable));
      formData.append('checkMx', String(options.checkMx));
      formData.append('removeDuplicates', String(options.removeDuplicates));
      
      const response = await fetch('/api/sanitize-emails', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Sanitization failed');
      }
      
      return response.json();
    },
    onSuccess: (data: SanitizationResults) => {
      setResults(data);
      toast({
        title: "Success",
        description: `Processed ${data.stats.total} emails: ${data.stats.valid} valid, ${data.stats.invalid} invalid`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sanitize emails",
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const response = await fetch('/api/sanitize-emails/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emails }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sanitized-emails.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Emails exported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to export emails",
        variant: "destructive",
      });
    },
  });

  const handleSanitize = () => {
    if (uploadFile) {
      sanitizeMutation.mutate({ file: uploadFile });
    } else if (emailText.trim()) {
      sanitizeMutation.mutate({ emails: emailText });
    } else {
      toast({
        title: "Error",
        description: "Please provide emails to sanitize",
        variant: "destructive",
      });
    }
  };

  const handleExport = (type: 'valid' | 'invalid') => {
    if (!results) return;
    
    const emails = type === 'valid' 
      ? results.validEmails 
      : results.invalidEmails.map(e => e.email);
    
    if (emails.length === 0) {
      toast({
        title: "No emails",
        description: `No ${type} emails to export`,
        variant: "destructive",
      });
      return;
    }
    
    exportMutation.mutate(emails);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Email Sanitization</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Validate and clean your email lists to ensure delivery success
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Input Emails</CardTitle>
                <CardDescription>
                  Upload a CSV file or paste emails directly to sanitize
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="paste" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="paste" data-testid="tab-paste-emails">
                      <FileText className="w-4 h-4 mr-2" />
                      Paste Emails
                    </TabsTrigger>
                    <TabsTrigger value="upload" data-testid="tab-upload-csv">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload CSV
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="paste" className="space-y-4">
                    <div>
                      <Label htmlFor="email-text">Email Addresses</Label>
                      <Textarea
                        id="email-text"
                        placeholder="Enter email addresses (one per line, comma, or semicolon separated)"
                        className="min-h-[200px] mt-2"
                        value={emailText}
                        onChange={(e) => setEmailText(e.target.value)}
                        data-testid="textarea-emails"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Example: user1@example.com, user2@example.com
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4">
                    <div>
                      <Label htmlFor="csv-upload">CSV File</Label>
                      <div className="mt-2">
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            dark:file:bg-blue-900 dark:file:text-blue-300
                            dark:hover:file:bg-blue-800"
                          data-testid="input-csv-file"
                        />
                      </div>
                      {uploadFile && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Selected: {uploadFile.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        CSV must have an "email" column
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 space-y-4">
                  <Label className="text-base font-semibold">Validation Options</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="check-format"
                        checked={options.checkFormat}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, checkFormat: checked as boolean })
                        }
                        data-testid="checkbox-format"
                      />
                      <label
                        htmlFor="check-format"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Check email format
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="check-disposable"
                        checked={options.checkDisposable}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, checkDisposable: checked as boolean })
                        }
                        data-testid="checkbox-disposable"
                      />
                      <label
                        htmlFor="check-disposable"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Block disposable emails
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="check-mx"
                        checked={options.checkMx}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, checkMx: checked as boolean })
                        }
                        data-testid="checkbox-mx"
                      />
                      <label
                        htmlFor="check-mx"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Verify MX records
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remove-duplicates"
                        checked={options.removeDuplicates}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, removeDuplicates: checked as boolean })
                        }
                        data-testid="checkbox-duplicates"
                      />
                      <label
                        htmlFor="remove-duplicates"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Remove duplicates
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleSanitize}
                    disabled={sanitizeMutation.isPending}
                    className="w-full"
                    data-testid="button-sanitize"
                  >
                    {sanitizeMutation.isPending ? (
                      "Processing..."
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Sanitize Emails
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {results && (
              <Card>
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    Summary of email validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg" data-testid="stat-total">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{results.stats.total}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg" data-testid="stat-valid">
                      <div className="text-sm text-green-600 dark:text-green-400">Valid</div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">{results.stats.valid}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg" data-testid="stat-invalid">
                      <div className="text-sm text-red-600 dark:text-red-400">Invalid</div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-100">{results.stats.invalid}</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg" data-testid="stat-duplicates">
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">Duplicates</div>
                      <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{results.stats.duplicates}</div>
                    </div>
                  </div>

                  <Tabs defaultValue="valid" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="valid" data-testid="tab-valid-emails">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Valid Emails ({results.validEmails.length})
                      </TabsTrigger>
                      <TabsTrigger value="invalid" data-testid="tab-invalid-emails">
                        <XCircle className="w-4 h-4 mr-2" />
                        Invalid Emails ({results.invalidEmails.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="valid" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {results.validEmails.length} valid email(s) found
                        </p>
                        {results.validEmails.length > 0 && (
                          <Button
                            onClick={() => handleExport('valid')}
                            variant="outline"
                            size="sm"
                            disabled={exportMutation.isPending}
                            data-testid="button-export-valid"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export Valid
                          </Button>
                        )}
                      </div>
                      {results.validEmails.length > 0 ? (
                        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {results.validEmails.map((email, index) => (
                                <TableRow key={index} data-testid={`row-valid-email-${index}`}>
                                  <TableCell className="font-medium">{email}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="default" className="bg-green-600">
                                      Valid
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No valid emails found
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="invalid" className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {results.invalidEmails.length} invalid email(s) found
                        </p>
                        {results.invalidEmails.length > 0 && (
                          <Button
                            onClick={() => handleExport('invalid')}
                            variant="outline"
                            size="sm"
                            disabled={exportMutation.isPending}
                            data-testid="button-export-invalid"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export Invalid
                          </Button>
                        )}
                      </div>
                      {results.invalidEmails.length > 0 ? (
                        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {results.invalidEmails.map((result, index) => (
                                <TableRow key={index} data-testid={`row-invalid-email-${index}`}>
                                  <TableCell className="font-medium">{result.email}</TableCell>
                                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                    {result.reason}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="destructive">
                                      Invalid
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No invalid emails found
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
