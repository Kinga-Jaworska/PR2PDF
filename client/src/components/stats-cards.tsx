import { GitMerge, FileText, FlaskConical, GitBranch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Statistics {
  activePRs: number;
  reportsGenerated: number;
  connectedRepos: number;
  testScenariosGenerated: number;
}

interface StatsCardsProps {
  statistics?: Statistics;
  isLoading: boolean;
}

export default function StatsCards({ statistics, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Active PRs",
      value: statistics?.activePRs || 0,
      icon: GitMerge,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      change: "+3",
      changeLabel: "from last week",
      testId: "stat-active-prs"
    },
    {
      title: "Reports Generated", 
      value: statistics?.reportsGenerated || 0,
      icon: FileText,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      change: "+8",
      changeLabel: "this month",
      testId: "stat-reports-generated"
    },
    {
      title: "Test Scenarios",
      value: statistics?.testScenariosGenerated || 0,
      icon: FlaskConical,
      iconBg: "bg-purple-100", 
      iconColor: "text-purple-600",
      change: "+24",
      changeLabel: "generated today",
      testId: "stat-test-scenarios"
    },
    {
      title: "Connected Repos",
      value: statistics?.connectedRepos || 0,
      icon: GitBranch,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      change: "All systems",
      changeLabel: "operational",
      positive: true,
      testId: "stat-connected-repos"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} data-testid={stat.testId}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.iconBg} rounded-full flex items-center justify-center`}>
                  <Icon className={`${stat.iconColor} h-6 w-6`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`${stat.positive ? 'text-green-600' : 'text-green-600'} font-medium`}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground ml-1">{stat.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
