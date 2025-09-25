// Login page - redirects to dashboard on success
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, BarChart3, Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  const onLogin = (data: LoginData) => {
    try {
      console.log('Submitting login:', { email: data.email, hasPassword: !!data.password });
      loginMutation.mutate(data);
    } catch (error) {
      console.error('Login submission error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Column - Login Form */}
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
              Sign in to your account
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>
                Enter your email and password to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            data-testid="input-login-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              data-testid="input-login-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
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
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                    data-testid="button-login-submit"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
                    Sign up
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