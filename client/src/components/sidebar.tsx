import { Home, GitBranch, GitMerge, FileText, Bot, ExternalLink, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Repository {
  id: string;
  name: string;
  fullName: string;
}

interface SidebarProps {
  repositories: Repository[];
  isLoading: boolean;
  onAddRepository: () => void;
}

export default function Sidebar({ repositories, isLoading, onAddRepository }: SidebarProps) {
  const getStatusColor = (index: number) => {
    const colors = ["bg-green-500", "bg-yellow-500", "bg-red-500"];
    return colors[index % colors.length];
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <GitBranch className="text-primary-foreground text-sm" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">PR Insight</h1>
            <p className="text-xs text-muted-foreground">v1.2.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        

        <div className="mt-8">
          <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Connected Repos
          </h3>
          
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {repositories.map((repo, index) => (
                <div 
                  key={repo.id} 
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent group"
                  data-testid={`repo-${repo.name}`}
                >
                  <div className={`w-2 h-2 ${getStatusColor(index)} rounded-full`} />
                  <span className="text-sm text-foreground font-mono truncate">
                    {repo.name}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3" 
            onClick={onAddRepository}
            data-testid="button-add-repository"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
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
    </aside>
  );
}
