import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  Mail, 
  BarChart3, 
  NotebookPen, 
  FileText, 
  Users, 
  Settings,
  LogOut,
  Shield,
  Globe,
  MailCheck,
  Activity,
  FilterX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DOMPurify from 'dompurify';

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "SES Dashboard", href: "/ses-dashboard", icon: Shield },
  { name: "Domains", href: "/domains", icon: Globe },
  { name: "Email Verification", href: "/email-verification", icon: MailCheck },
  { name: "Configuration Sets", href: "/configuration-sets", icon: Activity },
  { name: "Send Email", href: "/send-email", icon: NotebookPen },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Recipients", href: "/recipients", icon: Users },
  { name: "Sanitize Emails", href: "/sanitize-emails", icon: FilterX },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const sanitize = (str: string) => DOMPurify.sanitize(str);

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const initials = (user as any)?.firstName && (user as any)?.lastName 
    ? `${(user as any).firstName[0]}${(user as any).lastName[0]}`
    : (user as any)?.email?.[0]?.toUpperCase() || "U";

  return (
    <aside className="w-64 bg-card border-r border-border shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center font-semibold">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
              SES Manager
            </h1>
            <p className="text-sm text-muted-foreground">AWS Email Service</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          const safeName = sanitize(item.name);
          return (
            <Link
              key={safeName}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              data-testid={`nav-${safeName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{safeName}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          {(user as any)?.profileImageUrl ? (
            <img 
              src={(user as any).profileImageUrl} 
              alt="Profile" 
              className="w-8 h-8 rounded-full object-cover"
              data-testid="img-user-avatar"
            />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium" data-testid="text-user-initials">
                {initials}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-display-name">
              {[(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(' ') || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-display-email">
              {(user as any)?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/api/logout'}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
