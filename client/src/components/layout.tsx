import { Link, useLocation } from "wouter";
import { Home, GitPullRequest, BarChart3, Database, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: Home,
      testId: "nav-dashboard"
    },
    {
      path: "/repositories",
      label: "Repositories", 
      icon: Database,
      testId: "nav-repositories"
    },
    {
      path: "/templates",
      label: "Report Templates", 
      icon: FileText,
      testId: "nav-templates"
    },
    {
      path: "/pull-requests",
      label: "Pull Requests", 
      icon: GitPullRequest,
      testId: "nav-pull-requests"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-foreground flex items-center">
                <BarChart3 className="mr-2 h-6 w-6" />
                PR Insight
              </h1>
              <nav className="flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? "default" : "ghost"}
                      asChild
                      data-testid={item.testId}
                    >
                      <Link href={item.path}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">John Developer</p>
                <p className="text-xs text-muted-foreground truncate">Senior QA Engineer</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground" data-testid="button-settings">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}