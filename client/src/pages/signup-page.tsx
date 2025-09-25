// Signup page - redirects to login page on success
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, BarChart3, Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Redirect, Link, useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterData = z.infer<typeof registerSchema>;

export default function SignupPage() {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  const registerMutation = useMutation({
    mutationFn: async (data: Omit<RegisterData, "confirmPassword">) => {
      const response = await apiRequest("POST", "/api/register", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully!",
        description: "Please sign in with your credentials.",
      });
      setLocation("/login");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onRegister = (data: RegisterData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      console.log('Submitting registration:', { email: registerData.email, hasPassword: !!registerData.password });
      registerMutation.mutate(registerData);
    } catch (error) {
      console.error('Registration submission error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Column - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-primary text-primary-foreground w-16 h-16 rounded-lg flex items-center justify-center">
                <Mail className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">SES Manager</h1>
            <p className="text-muted-foreground mt-2">
              Create your account to get started
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create account</CardTitle>
              <CardDescription>
                Create a new account to start managing your email campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              data-testid="input-register-firstname"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              data-testid="input-register-lastname"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            data-testid="input-register-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              data-testid="input-register-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password-register"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              data-testid="input-register-confirm-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                    data-testid="button-register-submit"
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Column - Hero Section */}
      <div className="hidden lg:flex flex-1 bg-muted p-8 items-center justify-center">
        <div className="max-w-md text-center space-y-6">
          <h2 className="text-3xl font-bold">Powerful Email Management</h2>
          <p className="text-lg text-muted-foreground">
            Take control of your email campaigns with our comprehensive SES management platform.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Mass Email Sending</h3>
                <p className="text-sm text-muted-foreground">Send personalized emails to thousands</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 text-green-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Advanced Analytics</h3>
                <p className="text-sm text-muted-foreground">Track opens, clicks, and engagement</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 text-purple-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Secure & Reliable</h3>
                <p className="text-sm text-muted-foreground">Enterprise-grade security and encryption</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}