import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Eye, Calendar, User, GitPullRequest, Building } from "lucide-react";
import { format } from "date-fns";
import type { Report, PullRequest, Repository, RepositoryReport } from "@shared/schema";

type ReportWithDetails = Report & {
  pullRequest: PullRequest & {
    repository: Repository;
  };
};

type RepositoryReportWithDetails = RepositoryReport & {
  repository: Repository;
};

export default function ReportsPage() {
  const { data: reports, isLoading: reportsLoading } = useQuery<ReportWithDetails[]>({
    queryKey: ["/api/reports"],
  });

  const { data: repositoryReports, isLoading: repositoryReportsLoading } = useQuery<RepositoryReportWithDetails[]>({
    queryKey: ["/api/repository-reports"],
  });

  const isLoading = reportsLoading || repositoryReportsLoading;

  // Filter MVP reports (repository reports with type 'mvp_summary')
  const mvpReports = repositoryReports?.filter(report => report.reportType === 'mvp_summary') || [];

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
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handlePreview = (reportId: string) => {
    const previewUrl = `/api/reports/${reportId}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  };

  const handleRepositoryReportDownload = async (reportId: string) => {
    try {
      const response = await fetch(`/api/repositories/reports/${reportId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `repository-report-${reportId}.pdf`;
        
        if (contentDisposition) {
          const matches = contentDisposition.match(/filename="([^"]+)"/);
          if (matches) {
            filename = matches[1];
          }
        } else {
          const contentType = response.headers.get('Content-Type');
          if (contentType?.includes('text/html')) {
            filename = `repository-report-${reportId}.html`;
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Repository report download failed:", error);
    }
  };

  const handleRepositoryReportPreview = (reportId: string) => {
    const previewUrl = `/api/repositories/reports/${reportId}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
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
            All AI-generated reports for your pull requests and repositories ({(reports?.length || 0) + (repositoryReports?.length || 0)} total)
          </p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full" data-testid="reports-tabs">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all" data-testid="tab-all-reports">
            All Reports ({(reports?.length || 0) + (repositoryReports?.length || 0)})
          </TabsTrigger>
          <TabsTrigger value="mvp" data-testid="tab-mvp-reports">
            MVP Reports ({mvpReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" data-testid="tab-content-all">
          {(!reports || reports.length === 0) && (!repositoryReports || repositoryReports.length === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No reports generated yet</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Generate your first report by going to the Pull Requests tab for PR reports or the Dashboard for repository reports.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Repository Reports */}
              {[...(repositoryReports ?? [])].sort((a, b) => new Date(b.generatedAt!).getTime() - new Date(a.generatedAt!).getTime()).map((report) => (
                <Card key={`repo-${report.id}`} className="hover:shadow-md transition-shadow" data-testid={`repository-report-${report.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300" data-testid={`badge-${report.reportType}`}>
                            <Building className="h-3 w-3 mr-1" />
                            {report.reportType === 'mvp_summary' ? 'MVP Summary' : 'Client Overview'}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg" data-testid="repository-report-title">
                          {report.repository.name} - {report.reportType === 'mvp_summary' ? 'MVP Summary' : 'Client Overview'} Report
                          {(() => {
                            const sameTypeReports = (repositoryReports ?? [])
                              .filter(r => r.repository.id === report.repository.id && r.reportType === report.reportType)
                              .sort((a, b) => new Date(a.generatedAt!).getTime() - new Date(b.generatedAt!).getTime());
                            const reportIndex = sameTypeReports.findIndex(r => r.id === report.id);
                            return sameTypeReports.length > 1 ? ` (#${reportIndex + 1})` : '';
                          })()}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            Repository
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
                          onClick={() => handleRepositoryReportDownload(report.id)}
                          data-testid={`button-download-repo-${report.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRepositoryReportPreview(report.id)}
                          data-testid={`button-preview-repo-${report.id}`}
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
                          {report.repository.name}
                        </p>
                      </div>
                      
                      {typeof report.content === 'object' && report.content && 'summary' in report.content && (
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Summary</p>
                          <p className="text-sm text-muted-foreground line-clamp-2" data-testid="repository-report-summary">
                            {(report.content as any).summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pull Request Reports */}
              {reports?.map((report) => (
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
                          onClick={() => handlePreview(report.id)}
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
        </TabsContent>

        <TabsContent value="mvp" data-testid="tab-content-mvp">
          {mvpReports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No MVP reports generated yet</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Generate your first MVP report by going to the Dashboard and selecting "MVP Summary" as the report type.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {[...mvpReports].sort((a, b) => new Date(b.generatedAt!).getTime() - new Date(a.generatedAt!).getTime()).map((report) => (
                <Card key={`mvp-${report.id}`} className="hover:shadow-md transition-shadow" data-testid={`mvp-report-${report.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" data-testid={`badge-mvp-${report.id}`}>
                            <Building className="h-3 w-3 mr-1" />
                            MVP Summary
                          </Badge>
                        </div>
                        <CardTitle className="text-lg" data-testid="mvp-report-title">
                          {report.repository.name} - MVP Report
                          {(() => {
                            const sameRepoMvpReports = mvpReports
                              .filter(r => r.repository.id === report.repository.id)
                              .sort((a, b) => new Date(a.generatedAt!).getTime() - new Date(b.generatedAt!).getTime());
                            const reportIndex = sameRepoMvpReports.findIndex(r => r.id === report.id);
                            return sameRepoMvpReports.length > 1 ? ` (#${reportIndex + 1})` : '';
                          })()}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            Repository
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
                          onClick={() => handleRepositoryReportDownload(report.id)}
                          data-testid={`button-download-mvp-${report.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRepositoryReportPreview(report.id)}
                          data-testid={`button-preview-mvp-${report.id}`}
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
                        <p className="text-sm text-muted-foreground font-mono" data-testid="mvp-repo-name">
                          {report.repository.name}
                        </p>
                      </div>
                      
                      {typeof report.content === 'object' && report.content && 'summary' in report.content && (
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">MVP Summary</p>
                          <p className="text-sm text-muted-foreground line-clamp-3" data-testid="mvp-report-summary">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}