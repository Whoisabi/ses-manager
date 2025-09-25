import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Shield, BarChart3, Users, Zap, CheckCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-primary text-primary-foreground w-16 h-16 rounded-lg flex items-center justify-center">
                <Mail className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
              SES Manager
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              A powerful, secure fullstack web application for managing AWS Simple Email Service (SES). 
              Send mass emails, track engagement, and analyze your campaigns with ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
                className="text-lg px-8 py-3"
              >
                Log In
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-signup"
                className="text-lg px-8 py-3"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need for email marketing</h2>
            <p className="text-muted-foreground text-lg">
              Comprehensive tools to manage your AWS SES email campaigns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <CardTitle>Mass Email Sending</CardTitle>
                <CardDescription>
                  Send personalized emails to thousands of recipients using AWS SES with template variables
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-green-100 text-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Track opens, clicks, bounces, and complaints with detailed analytics and reporting
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <CardTitle>Recipient Management</CardTitle>
                <CardDescription>
                  Upload CSV files, organize recipient lists, and manage your contacts efficiently
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-orange-100 text-orange-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <CardTitle>Secure Credentials</CardTitle>
                <CardDescription>
                  Your AWS credentials are encrypted and stored securely. Never exposed to the frontend
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-red-100 text-red-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <CardTitle>Rich Text Editor</CardTitle>
                <CardDescription>
                  Compose beautiful emails with our WYSIWYG editor and reusable templates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="bg-indigo-100 text-indigo-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <CardTitle>Real-time Tracking</CardTitle>
                <CardDescription>
                  Monitor delivery status, bounces, and engagement metrics in real-time
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of users who trust SES Manager for their email campaigns
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-cta-login"
              className="text-lg px-8 py-3"
            >
              Log In
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-cta-signup"
              className="text-lg px-8 py-3"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground w-8 h-8 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <span className="font-semibold">SES Manager</span>
            </div>
          </div>
          <p className="text-center text-muted-foreground mt-4">
            © 2024 SES Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
