import { useState } from "react";
import { Sparkles, RefreshCw, Lightbulb, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Repository {
  id: string;
  name: string;
  fullName: string;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
}

interface QuickActionsProps {
  repositories: Repository[];
  insights: Insight[];
  isInsightsLoading: boolean;
}

export default function QuickActions({ repositories, insights, isInsightsLoading }: QuickActionsProps) {
  const [selectedAudience, setSelectedAudience] = useState<string>("pm");
  const [selectedRepository, setSelectedRepository] = useState<string>("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("last-7-days");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleGenerateCustomReport = async () => {
    if (!selectedRepository) {
      toast({
        title: "Select repository",
        description: "Please select a repository to generate a report for.",
        variant: "destructive",
      });
      return;
    }

    try {
      // This would generate a custom report based on the selections
      toast({
        title: "Report generation started",
        description: "Your custom report is being generated with AI.",
      });
    } catch (error) {
      console.error("Error generating custom report:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate custom report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshInsights = async () => {
    setIsRefreshing(true);
    try {
      await apiRequest("POST", "/api/insights/refresh", { 
        repositoryId: selectedRepository || undefined 
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      
      toast({
        title: "Insights refreshed",
        description: "AI insights have been updated with the latest data.",
      });
    } catch (error) {
      console.error("Error refreshing insights:", error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getInsightIcon = (type: string, severity: string) => {
    if (severity === "error") {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (severity === "warning") {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    return <Lightbulb className="h-4 w-4 text-blue-500" />;
  };

  const getInsightBadgeColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Report Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Custom Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Target Audience</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "pm", label: "PM", subtitle: "Project Manager" },
                { value: "qa", label: "QA", subtitle: "Quality Assurance" },
                { value: "client", label: "Client", subtitle: "Stakeholder" }
              ].map((audience) => (
                <label 
                  key={audience.value}
                  className={`flex items-center p-3 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedAudience === audience.value ? 'border-primary bg-primary/5' : ''
                  }`}
                  data-testid={`radio-audience-${audience.value}`}
                >
                  <input 
                    type="radio" 
                    name="audience" 
                    value={audience.value}
                    checked={selectedAudience === audience.value}
                    onChange={(e) => setSelectedAudience(e.target.value)}
                    className="sr-only" 
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-foreground">{audience.label}</div>
                    <div className="text-xs text-muted-foreground">{audience.subtitle}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="repository-select" className="text-sm font-medium text-foreground mb-2 block">
              Select Repository
            </Label>
            <Select value={selectedRepository} onValueChange={setSelectedRepository}>
              <SelectTrigger data-testid="select-repository">
                <SelectValue placeholder="Choose a repository" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.name}
                  </SelectItem>
                ))}
                <SelectItem value="all">All Repositories</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="time-range-select" className="text-sm font-medium text-foreground mb-2 block">
              Time Range
            </Label>
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-3-months">Last 3 months</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full" 
            onClick={handleGenerateCustomReport}
            data-testid="button-generate-custom-report"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Report with AI
          </Button>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>AI Insights</CardTitle>
          <Badge className="bg-blue-100 text-blue-800">
            <Sparkles className="mr-1 h-3 w-3" />
            Powered by Gemini
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInsightsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-4">
              {insights.slice(0, 3).map((insight) => (
                <div 
                  key={insight.id} 
                  className="p-4 bg-muted/50 rounded-lg"
                  data-testid={`insight-${insight.type}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${getInsightBadgeColor(insight.severity)}`}>
                      {getInsightIcon(insight.type, insight.severity)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-1">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No insights available yet.</p>
              <p className="text-xs text-muted-foreground">Connect repositories to get AI-powered insights.</p>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleRefreshInsights}
            disabled={isRefreshing}
            data-testid="button-refresh-insights"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Insights
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
