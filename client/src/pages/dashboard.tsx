import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import StatsCards from "@/components/stats-cards";
import RecentPullRequests from "@/components/recent-pull-requests";
import QuickActions from "@/components/quick-actions";
import AddRepositoryModal from "@/components/add-repository-modal";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Repository, PullRequest, Insight } from "@shared/schema";

export default function Dashboard() {
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: statistics, isLoading: statsLoading } = useQuery<{
    activePRs: number;
    reportsGenerated: number;
    connectedRepos: number;
    testScenariosGenerated: number;
  }>({
    queryKey: ["/api/statistics"],
  });

  const { data: repositories, isLoading: reposLoading } = useQuery<Repository[]>({
    queryKey: ["/api/repositories"],
  });

  const { data: pullRequests, isLoading: prsLoading } = useQuery<(PullRequest & { repository: Repository })[]>({
    queryKey: ["/api/pull-requests"],
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
  });

  const handleSyncAll = async () => {
    try {
      if (!repositories || repositories.length === 0) {
        toast({
          title: "No repositories",
          description: "Add repositories first to sync pull requests.",
          variant: "destructive",
        });
        return;
      }

      for (const repo of repositories) {
        await apiRequest("POST", `/api/repositories/${repo.id}/sync`);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/pull-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });

      toast({
        title: "Sync completed",
        description: "All repositories have been synchronized.",
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync failed",
        description: "Failed to sync repositories. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        repositories={repositories || []}
        isLoading={reposLoading}
        onAddRepository={() => setIsAddRepoModalOpen(true)}
      />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                <span>Dashboard</span>
                <span>/</span>
                <span className="text-foreground font-medium">Overview</span>
              </nav>
              <h1 className="text-2xl font-bold text-foreground">Repository Analysis Dashboard</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="secondary" 
                onClick={handleSyncAll}
                disabled={reposLoading}
                data-testid="button-sync-all"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync All
              </Button>
              <Button data-testid="button-generate-report">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          <StatsCards statistics={statistics} isLoading={statsLoading} />
          <RecentPullRequests pullRequests={pullRequests || []} isLoading={prsLoading} />
          <QuickActions 
            repositories={repositories || []} 
            insights={insights || []}
            isInsightsLoading={insightsLoading}
          />
        </div>
      </main>

      <AddRepositoryModal 
        isOpen={isAddRepoModalOpen}
        onClose={() => setIsAddRepoModalOpen(false)}
      />
    </div>
  );
}
