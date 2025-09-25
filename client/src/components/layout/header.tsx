import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function Header({ title, description, action }: HeaderProps) {
  const { data: awsCredentials } = useQuery({
    queryKey: ["/api/aws/credentials"],
  });

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            {title}
          </h2>
          <p className="text-muted-foreground" data-testid="text-page-description">
            {description}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* AWS Connection Status */}
          <div className="flex items-center space-x-2 bg-accent px-3 py-2 rounded-md">
            <div 
              className={`w-2 h-2 rounded-full ${
                (awsCredentials as any)?.connected ? 'bg-green-500' : 'bg-red-500'
              }`} 
            />
            <span className="text-sm font-medium" data-testid="text-aws-connection-status">
              {(awsCredentials as any)?.connected ? 'AWS Connected' : 'AWS Disconnected'}
            </span>
          </div>
          
          {/* Custom Action */}
          {action}
        </div>
      </div>
    </header>
  );
}
