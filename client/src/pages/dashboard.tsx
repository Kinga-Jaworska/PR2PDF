import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import StatsCards from "@/components/stats-cards";
import RecentPullRequests from "@/components/recent-pull-requests";
import QuickActions from "@/components/quick-actions";
import AddRepositoryModal from "@/components/add-repository-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, FileText, Building, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Repository, PullRequest, Insight, ReportTemplate } from "@shared/schema";

export default function Dashboard() {
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState<string>("");
  const [selectedReportType, setSelectedReportType] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
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

  const { data: templates } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const generateRepositoryReportMutation = useMutation({
    mutationFn: async ({ repositoryId, reportType, templateId }: { repositoryId: string; reportType: string; templateId?: string }) => {
      const body: any = { repositoryId, reportType };
      if (templateId) {
        body.templateId = templateId;
      }
      return apiRequest("POST", "/api/repositories/reports", body);
    },
    onSuccess: () => {
      toast({
        title: "Report generated",
        description: "Repository report has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repositories/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
    },
    onError: (error) => {
      console.error("Repository report generation error:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate repository report. Please try again.",
        variant: "destructive",
      });
    },
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

  const handleGenerateRepositoryReport = () => {
    if (!selectedRepository || !selectedReportType) {
      toast({
        title: "Missing selection",
        description: "Please select a repository and report type.",
        variant: "destructive",
      });
      return;
    }

    generateRepositoryReportMutation.mutate({
      repositoryId: selectedRepository,
      reportType: selectedReportType,
      templateId: selectedTemplate || undefined,
    });
  };

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repository Analysis Dashboard</h1>
          <p className="text-muted-foreground">Overview of your connected repositories and generated reports</p>
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
          <Button 
            onClick={() => setIsAddRepoModalOpen(true)}
            data-testid="button-add-repository"
          >
            <FileText className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <StatsCards statistics={statistics} isLoading={statsLoading} />
      
      {/* Repository Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Generate Repository Report
          </CardTitle>
          <CardDescription>
            Create comprehensive MVP progress and client overview reports for your repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository</label>
              <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                <SelectTrigger data-testid="select-repository">
                  <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent>
                  {repositories?.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mvp_summary">MVP Summary</SelectItem>
                  <SelectItem value="client_overview">Client Overview</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Template (Optional)</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleGenerateRepositoryReport}
              disabled={!selectedRepository || !selectedReportType || generateRepositoryReportMutation.isPending}
              data-testid="button-generate-repository-report"
            >
              {generateRepositoryReportMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RecentPullRequests pullRequests={pullRequests || []} isLoading={prsLoading} />
      <QuickActions 
        repositories={repositories || []} 
        insights={insights || []}
        isInsightsLoading={insightsLoading}
      />

      <AddRepositoryModal 
        isOpen={isAddRepoModalOpen}
        onClose={() => setIsAddRepoModalOpen(false)}
      />
    </div>
  );
}
