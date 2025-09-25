import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotebookPen, Upload, FileText } from "lucide-react";
import { Link } from "wouter";

export default function QuickActions() {
  const actions = [
    {
      icon: NotebookPen,
      title: "Send Email",
      description: "Compose and send emails",
      iconColor: "bg-blue-100 text-blue-600",
      href: "/send-email",
      testId: "action-send-email"
    },
    {
      icon: Upload,
      title: "Upload Recipients",
      description: "Import CSV recipient list",
      iconColor: "bg-green-100 text-green-600",
      href: "/recipients",
      testId: "action-upload-recipients"
    },
    {
      icon: FileText,
      title: "Create Template",
      description: "Design reusable templates",
      iconColor: "bg-purple-100 text-purple-600",
      href: "/templates",
      testId: "action-create-template"
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            
            return (
              <Link key={action.title} href={action.href}>
                <Button
                  variant="outline"
                  className="flex items-center space-x-3 p-4 h-auto text-left w-full justify-start hover:bg-accent transition-colors"
                  data-testid={action.testId}
                >
                  <div className={`p-3 rounded-lg ${action.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
