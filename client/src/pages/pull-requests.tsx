import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GitBranch, Clock, User, FileText, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PullRequest {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  authorName: string;
  authorAvatar?: string;
  status: string;
  reviewStatus?: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  githubId: number;
  repository: {
    id: string;
    name: string;
    fullName: string;
  };
}

export default function PullRequestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [repositoryFilter, setRepositoryFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: pullRequests = [], isLoading, refetch } = useQuery<PullRequest[]>({
    queryKey: ["/api/pull-requests"],
  });

  const { data: repositories = [] } = useQuery<any[]>({
    queryKey: ["/api/repositories"],
  });

  const filteredPullRequests = pullRequests.filter((pr) => {
    const matchesSearch = pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pr.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pr.repository.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || pr.status === statusFilter;
    const matchesRepository = repositoryFilter === "all" || pr.repositoryId === repositoryFilter;
    
    return matchesSearch && matchesStatus && matchesRepository;
  });

  const handleGenerateReport = async (pullRequestId: string, audienceType: string) => {
    try {
      await apiRequest("POST", `/api/pull-requests/${pullRequestId}/reports`, {
        audienceType,
      });
      toast({
        title: "Report generated",
        description: "The report has been generated successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to generate report",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "merged":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getReviewStatusColor = (reviewStatus?: string) => {
    switch (reviewStatus) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "changes_requested":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Pull Requests</h1>
          <p className="text-muted-foreground">
            Manage and analyze pull requests across all connected repositories
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Filter Pull Requests
              </span>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                data-testid="button-refresh-prs"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Search PRs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-prs"
                />
              </div>
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="merged">Merged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={repositoryFilter} onValueChange={setRepositoryFilter}>
                  <SelectTrigger data-testid="select-repository-filter">
                    <SelectValue placeholder="Filter by repository" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Repositories</SelectItem>
                    {repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.id}>
                        {repo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground flex items-center">
                Showing {filteredPullRequests.length} of {pullRequests.length} pull requests
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pull Requests List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                Loading pull requests...
              </div>
            </CardContent>
          </Card>
        ) : filteredPullRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                {pullRequests.length === 0 
                  ? "No pull requests found. Connect a repository to get started."
                  : "No pull requests match your filters."}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPullRequests.map((pr) => (
              <Card key={pr.id} data-testid={`pr-card-${pr.number}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* PR Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm text-muted-foreground">
                          {pr.repository.fullName}#{pr.number}
                        </span>
                        <Badge className={getStatusColor(pr.status)}>
                          {pr.status}
                        </Badge>
                        {pr.reviewStatus && (
                          <Badge variant="outline" className={getReviewStatusColor(pr.reviewStatus)}>
                            {pr.reviewStatus.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>

                      {/* PR Title */}
                      <h3 className="text-lg font-semibold mb-2">{pr.title}</h3>

                      {/* PR Meta */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {pr.authorName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(pr.createdAt))} ago
                        </div>
                        {pr.mergedAt && (
                          <div className="text-purple-600 dark:text-purple-400">
                            Merged {formatDistanceToNow(new Date(pr.mergedAt))} ago
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Select onValueChange={(audienceType) => handleGenerateReport(pr.id, audienceType)}>
                        <SelectTrigger className="w-40" data-testid={`select-generate-${pr.number}`}>
                          <SelectValue placeholder="Generate Report" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pm">PM Report</SelectItem>
                          <SelectItem value="qa">QA Report</SelectItem>
                          <SelectItem value="client">Client Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}