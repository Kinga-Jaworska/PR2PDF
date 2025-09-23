import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Eye, Calendar, User, GitPullRequest } from "lucide-react";
import { format } from "date-fns";
import type { Report, PullRequest, Repository } from "@shared/schema";

type ReportWithDetails = Report & {
  pullRequest: PullRequest & {
    repository: Repository;
  };
};

export default function ReportsPage() {
  const { data: reports, isLoading } = useQuery<ReportWithDetails[]>({
    queryKey: ["/api/reports"],
  });

  const getAudienceColor = (audienceType: string) => {
    switch (audienceType) {
      case "pm":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "qa":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "client":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getAudienceLabel = (audienceType: string) => {
    switch (audienceType) {
      case "pm":
        return "Project Manager";
      case "qa":
        return "QA Team";
      case "client":
        return "Client";
      default:
        return audienceType.toUpperCase();
    }
  };

  const handleDownload = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Generated Reports</h1>
            <p className="text-muted-foreground">All AI-generated reports for your pull requests</p>
          </div>
        </div>
        
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generated Reports</h1>
          <p className="text-muted-foreground">
            All AI-generated reports for your pull requests ({reports?.length || 0} total)
          </p>
        </div>
      </div>

      {!reports || reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No reports generated yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Generate your first report by going to the Pull Requests tab and clicking "Generate Report" on any pull request.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow" data-testid={`report-${report.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getAudienceColor(report.audienceType)} data-testid={`badge-${report.audienceType}`}>
                        {getAudienceLabel(report.audienceType)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg" data-testid="report-title">
                      {report.pullRequest.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <GitPullRequest className="h-4 w-4" />
                        PR #{report.pullRequest.number}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {report.pullRequest.authorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(report.generatedAt!), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(report.id)}
                      data-testid={`button-download-${report.id}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-preview-${report.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Repository</p>
                    <p className="text-sm text-muted-foreground font-mono" data-testid="repo-name">
                      {report.pullRequest.repository.name}
                    </p>
                  </div>
                  
                  {typeof report.content === 'object' && report.content && 'summary' in report.content && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Summary</p>
                      <p className="text-sm text-muted-foreground line-clamp-2" data-testid="report-summary">
                        {(report.content as any).summary}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}