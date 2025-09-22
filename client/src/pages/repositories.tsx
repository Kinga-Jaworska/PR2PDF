import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Database, GitBranch, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AddRepositoryModal from "@/components/add-repository-modal";
import type { Repository } from "@shared/schema";

export default function RepositoriesPage() {
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: repositories, isLoading: reposLoading } = useQuery<Repository[]>({
    queryKey: ["/api/repositories"],
  });

  const handleSyncRepository = async (repositoryId: string) => {
    try {
      await apiRequest("POST", `/api/repositories/${repositoryId}/sync`);
      await queryClient.invalidateQueries({ queryKey: ["/api/pull-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      
      toast({
        title: "Sync completed",
        description: "Repository has been synchronized.",
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync failed",
        description: "Failed to sync repository. Please try again.",
        variant: "destructive",
      });
    }
  };

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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-repositories-title">Repositories</h1>
          <p className="text-muted-foreground">
            Manage your connected GitHub repositories and sync pull requests.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleSyncAll}
            variant="outline"
            disabled={reposLoading || !repositories?.length}
            data-testid="button-sync-all"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All
          </Button>
          <Button
            onClick={() => setIsAddRepoModalOpen(true)}
            data-testid="button-add-repository"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
      </div>

      {/* Repository Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reposLoading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading repositories...
          </div>
        ) : repositories && repositories.length > 0 ? (
          repositories.map((repo) => (
            <Card key={repo.id} className="relative" data-testid={`card-repository-${repo.id}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <span data-testid={`text-repo-name-${repo.id}`}>
                      {repo.name}
                    </span>
                  </div>
                </CardTitle>
                <Badge variant="secondary" data-testid={`badge-branch-${repo.id}`}>
                  <GitBranch className="mr-1 h-3 w-3" />
                  {repo.defaultBranch}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <CardDescription data-testid={`text-repo-description-${repo.id}`}>
                    {repo.description || "No description available"}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      <span>Connected</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncRepository(repo.id)}
                      data-testid={`button-sync-${repo.id}`}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Sync
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-repositories">
                  No repositories connected
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect your first GitHub repository to start analyzing pull requests.
                </p>
                <Button
                  onClick={() => setIsAddRepoModalOpen(true)}
                  data-testid="button-add-first-repository"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Repository
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={isAddRepoModalOpen}
        onOpenChange={setIsAddRepoModalOpen}
      />
    </div>
  );
}