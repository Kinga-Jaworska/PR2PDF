import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { GitBranch, Clock, User, FileText, Download, RefreshCw, Users, TestTube, UserCheck, AlertTriangle, AlertCircle, AlertOctagon, CheckCircle, ChevronDown, Eye } from "lucide-react";
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
  reports?: any[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  type: "pm" | "qa" | "client";
  content: string;
  isDefault: boolean;
  createdAt: Date;
}

export default function PullRequestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [repositoryFilter, setRepositoryFilter] = useState<string>("all");
  // Remove selectedTemplate state as we no longer need it
  const { toast } = useToast();

  // Default templates
  const defaultTemplates: Template[] = [
    {
      id: "pm-default",
      name: "Project Manager Report",
      description: "Comprehensive overview for project managers with timeline and impact analysis",
      type: "pm",
      content: "",
      isDefault: true,
      createdAt: new Date()
    },
    {
      id: "qa-default", 
      name: "QA Testing Report",
      description: "Detailed testing scenarios and quality assurance checklist",
      type: "qa",
      content: "",
      isDefault: true,
      createdAt: new Date()
    },
    {
      id: "client-default",
      name: "Client Update Report", 
      description: "Client-friendly summary with business value and user impact",
      type: "client",
      content: "",
      isDefault: true,
      createdAt: new Date()
    }
  ];

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
        description: `The ${audienceType.toUpperCase()} report has been generated successfully.`,
      });
      
      // Refetch to update the UI with new reports
      refetch();
    } catch (error) {
      toast({
        title: "Failed to generate report",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAllReports = async (pullRequestId: string) => {
    try {
      await Promise.all([
        apiRequest("POST", `/api/pull-requests/${pullRequestId}/reports`, { audienceType: "pm" }),
        apiRequest("POST", `/api/pull-requests/${pullRequestId}/reports`, { audienceType: "qa" }),
        apiRequest("POST", `/api/pull-requests/${pullRequestId}/reports`, { audienceType: "client" })
      ]);
      toast({
        title: "All reports generated",
        description: "PM, QA, and Client reports have been generated successfully.",
      });
      
      // Refetch to update the UI with new reports
      refetch();
    } catch (error) {
      toast({
        title: "Failed to generate reports",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const getReportStatus = (pr: PullRequest) => {
    if (!pr.reports || pr.reports.length === 0) {
      return "no-reports";
    }
    return "has-reports";
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case "pm": return <Users className="h-4 w-4" />;
      case "qa": return <TestTube className="h-4 w-4" />;
      case "client": return <UserCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
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

  const assessPRRisk = (pr: PullRequest): 'risky' | 'less-risky' | 'warnings' | 'not-problematic' => {
    // Risky PRs (red) - closed, changes requested, or problematic patterns
    if (pr.status === 'closed' || pr.reviewStatus === 'changes_requested') {
      return 'risky';
    }
    
    // Less risky PRs (orange) - pending review for extended time or complex changes
    if (pr.status === 'open' && !pr.reviewStatus) {
      return 'less-risky';
    }
    
    // Warnings (yellow) - open with some review activity but not merged
    if (pr.status === 'open' && pr.reviewStatus && pr.reviewStatus !== 'approved') {
      return 'warnings';
    }
    
    // Not problematic (green) - merged or approved
    if (pr.status === 'merged' || pr.reviewStatus === 'approved') {
      return 'not-problematic';
    }
    
    // Default to warnings for unknown states
    return 'warnings';
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'risky':
        return <AlertOctagon className="h-4 w-4 text-red-500" data-testid="risk-icon-risky" />;
      case 'less-risky':
        return <AlertTriangle className="h-4 w-4 text-orange-500" data-testid="risk-icon-less-risky" />;
      case 'warnings':
        return <AlertCircle className="h-4 w-4 text-yellow-500" data-testid="risk-icon-warnings" />;
      case 'not-problematic':
        return <CheckCircle className="h-4 w-4 text-green-500" data-testid="risk-icon-not-problematic" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" data-testid="risk-icon-default" />;
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
                          <div className="flex items-center gap-2">
                            {getRiskIcon(assessPRRisk(pr))}
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                          </div>
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
                    <div className="flex gap-2 items-center">
                      {getReportStatus(pr) === "has-reports" ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Generated
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/reports`, '_blank')}
                            data-testid={`button-view-reports-${pr.number}`}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Reports
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button data-testid={`button-generate-${pr.number}`}>
                              Generate Report
                              <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleGenerateReport(pr.id, "pm")}
                              data-testid={`menu-generate-pm-${pr.number}`}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              PM Report
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleGenerateReport(pr.id, "qa")}
                              data-testid={`menu-generate-qa-${pr.number}`}
                            >
                              <TestTube className="mr-2 h-4 w-4" />
                              QA Report
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleGenerateReport(pr.id, "client")}
                              data-testid={`menu-generate-client-${pr.number}`}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Client Report
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleGenerateAllReports(pr.id)}
                              data-testid={`menu-generate-all-${pr.number}`}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generate All Reports
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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