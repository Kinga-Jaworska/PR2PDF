import { useState } from "react";
import { Eye, Download, Bot, Clock, Check, X, AlertTriangle, AlertCircle, AlertOctagon, CheckCircle, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PullRequest {
  id: string;
  number: number;
  title: string;
  authorName: string;
  authorAvatar: string | null;
  status: string;
  reviewStatus: string | null;
  repository: {
    name: string;
    fullName: string;
  };
  reports?: any[];
}

interface RecentPullRequestsProps {
  pullRequests: PullRequest[];
  isLoading: boolean;
}

export default function RecentPullRequests({ pullRequests, isLoading }: RecentPullRequestsProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const getStatusBadge = (status: string, reviewStatus: string | null) => {
    if (status === "merged") {
      return <Badge className="bg-green-100 text-green-800"><Check className="mr-1 h-3 w-3" />Merged</Badge>;
    }
    if (status === "closed") {
      return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Closed</Badge>;
    }
    if (reviewStatus === "changes_requested") {
      return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Changes Requested</Badge>;
    }
    return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending Review</Badge>;
  };

  const getReportStatus = (pr: PullRequest) => {
    if (pr.reports && pr.reports.length > 0) {
      return <Badge className="bg-green-100 text-green-800"><Check className="mr-1 h-3 w-3" />Generated</Badge>;
    }
    return null;
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

  const handleGenerateReport = async (prId: string, audienceTypes: string | string[]) => {
    setGeneratingReports(prev => new Set(prev).add(prId));
    
    try {
      const typesToGenerate = Array.isArray(audienceTypes) ? audienceTypes : [audienceTypes];
      
      // Generate reports for all requested audience types
      for (const audienceType of typesToGenerate) {
        await apiRequest("POST", `/api/pull-requests/${prId}/reports`, { audienceType });
      }
      
      await queryClient.invalidateQueries({ queryKey: ["/api/pull-requests"] });
      
      const reportCount = typesToGenerate.length;
      toast({
        title: reportCount > 1 ? "Reports generated" : "Report generated",
        description: reportCount > 1 
          ? `${reportCount} reports have been successfully generated.`
          : "The report has been successfully generated.",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(prId);
        return newSet;
      });
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Extract filename from Content-Disposition header or determine from content type
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `report-${reportId}.pdf`; // Default to PDF
        
        if (contentDisposition) {
          const matches = contentDisposition.match(/filename="([^"]+)"/);
          if (matches) {
            filename = matches[1];
          }
        } else {
          // Fallback based on content type
          const contentType = response.headers.get('Content-Type');
          if (contentType?.includes('text/html')) {
            filename = `report-${reportId}.html`;
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Download failed",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewReport = (reportId: string) => {
    const previewUrl = `/api/reports/${reportId}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const uniqueRepos = Array.from(new Set(pullRequests.map(pr => pr.repository.name)));
  
  const filteredPRs = selectedRepo === "all" 
    ? pullRequests 
    : pullRequests.filter(pr => pr.repository.name === selectedRepo);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Recent Pull Requests</h2>
          <div className="flex items-center space-x-2">
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger className="w-48" data-testid="select-repository-filter">
                <SelectValue placeholder="All Repositories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Repositories</SelectItem>
                {uniqueRepos.map(repo => (
                  <SelectItem key={repo} value={repo}>{repo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pull Request
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Repository
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Author
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Report
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPRs.map((pr) => {
                const reportStatus = getReportStatus(pr);
                const isGenerating = generatingReports.has(pr.id);
                const riskLevel = assessPRRisk(pr);
                
                return (
                  <tr key={pr.id} className="hover:bg-muted/30 transition-colors" data-testid={`pr-row-${pr.number}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getRiskIcon(riskLevel)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{pr.title}</p>
                          <p className="text-xs text-muted-foreground font-mono">#{pr.number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-foreground">{pr.repository.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-foreground">
                            {pr.authorName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-foreground">{pr.authorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(pr.status, pr.reviewStatus)}
                    </td>
                    <td className="px-6 py-4">
                      {reportStatus || <span className="text-sm text-muted-foreground">No report yet</span>}
                    </td>
                    <td className="px-6 py-4">
                      {reportStatus ? (
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => pr.reports?.[0] && handleViewReport(pr.reports[0].id)}
                            data-testid={`button-view-report-${pr.number}`}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => pr.reports?.[0] && handleDownloadReport(pr.reports[0].id)}
                            data-testid={`button-download-report-${pr.number}`}
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled={isGenerating}
                              data-testid={`button-generate-report-${pr.number}`}
                            >
                              <Bot className="mr-1 h-3 w-3" />
                              {isGenerating ? "Generating..." : "Generate"}
                              <ChevronDown className="ml-1 h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleGenerateReport(pr.id, "pm")}
                              data-testid={`menu-generate-pm-${pr.number}`}
                            >
                              Generate PM Report
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleGenerateReport(pr.id, "qa")}
                              data-testid={`menu-generate-qa-${pr.number}`}
                            >
                              Generate QA Report
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleGenerateReport(pr.id, "client")}
                              data-testid={`menu-generate-client-${pr.number}`}
                            >
                              Generate Client Report
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleGenerateReport(pr.id, ["pm", "qa", "client"])}
                              data-testid={`menu-generate-all-${pr.number}`}
                            >
                              Generate All Reports
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
