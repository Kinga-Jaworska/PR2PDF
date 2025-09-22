import { Link, useLocation } from "wouter";
import { Home, GitPullRequest, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      path: "/pull-requests",
      label: "Pull Requests", 
      icon: GitPullRequest,
      testId: "nav-pull-requests"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground flex items-center">
            <BarChart3 className="mr-2 h-6 w-6" />
            PR Insight
          </h1>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-primary text-primary-foreground"
                )}
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
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}