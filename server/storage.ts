import { 
  repositories, 
  pullRequests, 
  reports, 
  insights,
  reportTemplates,
  repositoryReports,
  type Repository, 
  type InsertRepository,
  type PullRequest,
  type InsertPullRequest,
  type Report,
  type InsertReport,
  type Insight,
  type InsertInsight,
  type ReportTemplate,
  type InsertReportTemplate,
  type RepositoryReport,
  type InsertRepositoryReport
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Repositories
  getRepositories(): Promise<Repository[]>;
  getRepository(id: string): Promise<Repository | undefined>;
  getRepositoryWithToken(id: string): Promise<Repository | undefined>;
  getRepositoryByFullName(fullName: string): Promise<Repository | undefined>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  updateRepository(id: string, updates: Partial<InsertRepository>): Promise<Repository | undefined>;
  deleteRepository(id: string): Promise<boolean>;

  // Pull Requests
  getPullRequestsByRepository(repositoryId: string): Promise<PullRequest[]>;
  getPullRequest(id: string): Promise<PullRequest | undefined>;
  getPullRequestByGithubId(githubId: number): Promise<PullRequest | undefined>;
  createPullRequest(pullRequest: InsertPullRequest): Promise<PullRequest>;
  updatePullRequest(id: string, updates: Partial<InsertPullRequest>): Promise<PullRequest | undefined>;
  getRecentPullRequests(limit?: number): Promise<(PullRequest & { repository: Repository; reports: Report[] })[]>;

  // Reports
  getReportsByPullRequest(pullRequestId: string): Promise<Report[]>;
  getAllReports(): Promise<(Report & { pullRequest: PullRequest & { repository: Repository } })[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<InsertReport>): Promise<Report | undefined>;
  getReportsCount(): Promise<number>;

  // Insights
  getInsightsByRepository(repositoryId: string): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  getRecentInsights(repositoryId?: string): Promise<Insight[]>;

  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplatesByAudience(audienceType: string): Promise<ReportTemplate[]>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: string, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<boolean>;
  getDefaultTemplates(): Promise<ReportTemplate[]>;

  // Repository Reports
  getRepositoryReports(repositoryId: string): Promise<RepositoryReport[]>;
  getAllRepositoryReports(): Promise<(RepositoryReport & { repository: Repository })[]>;
  getRepositoryReport(id: string): Promise<RepositoryReport | undefined>;
  createRepositoryReport(report: InsertRepositoryReport): Promise<RepositoryReport>;
  updateRepositoryReport(id: string, updates: Partial<InsertRepositoryReport>): Promise<RepositoryReport | undefined>;
  deleteRepositoryReport(id: string): Promise<boolean>;

  // Statistics
  getStatistics(): Promise<{
    activePRs: number;
    reportsGenerated: number;
    connectedRepos: number;
    testScenariosGenerated: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getRepositories(): Promise<Repository[]> {
    // Select all columns except githubToken for security
    const repos = await db.select().from(repositories).orderBy(desc(repositories.createdAt));
    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    } as Repository));
  }

  async getRepository(id: string): Promise<Repository | undefined> {
    // Select all columns except githubToken for security
    const [repository] = await db.select().from(repositories).where(eq(repositories.id, id));
    if (!repository) return undefined;
    return {
      id: repository.id,
      name: repository.name,
      fullName: repository.fullName,
      description: repository.description,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
    } as Repository;
  }

  async getRepositoryWithToken(id: string): Promise<Repository | undefined> {
    // Internal method that includes githubToken for GitHub API operations
    const [repository] = await db.select().from(repositories).where(eq(repositories.id, id));
    return repository || undefined;
  }

  async getRepositoryByFullName(fullName: string): Promise<Repository | undefined> {
    // Select all columns except githubToken for security
    const [repository] = await db.select().from(repositories).where(eq(repositories.fullName, fullName));
    if (!repository) return undefined;
    return {
      id: repository.id,
      name: repository.name,
      fullName: repository.fullName,
      description: repository.description,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
    } as Repository;
  }

  async createRepository(repository: InsertRepository): Promise<Repository> {
    const [created] = await db.insert(repositories).values(repository).returning();
    return created;
  }

  async updateRepository(id: string, updates: Partial<InsertRepository>): Promise<Repository | undefined> {
    const [updated] = await db
      .update(repositories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(repositories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRepository(id: string): Promise<boolean> {
    const result = await db.delete(repositories).where(eq(repositories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPullRequestsByRepository(repositoryId: string): Promise<PullRequest[]> {
    return await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.repositoryId, repositoryId))
      .orderBy(desc(pullRequests.updatedAt));
  }

  async getPullRequest(id: string): Promise<PullRequest | undefined> {
    const [pullRequest] = await db.select().from(pullRequests).where(eq(pullRequests.id, id));
    return pullRequest || undefined;
  }

  async getPullRequestByGithubId(githubId: number): Promise<PullRequest | undefined> {
    const [pullRequest] = await db.select().from(pullRequests).where(eq(pullRequests.githubId, githubId));
    return pullRequest || undefined;
  }

  async createPullRequest(pullRequest: InsertPullRequest): Promise<PullRequest> {
    const [created] = await db.insert(pullRequests).values(pullRequest).returning();
    return created;
  }

  async updatePullRequest(id: string, updates: Partial<InsertPullRequest>): Promise<PullRequest | undefined> {
    const [updated] = await db
      .update(pullRequests)
      .set(updates)
      .where(eq(pullRequests.id, id))
      .returning();
    return updated || undefined;
  }

  async getRecentPullRequests(limit = 10): Promise<(PullRequest & { repository: Repository; reports: Report[] })[]> {
    const result = await db
      .select()
      .from(pullRequests)
      .leftJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
      .orderBy(desc(pullRequests.updatedAt))
      .limit(limit);

    // Fetch reports for each pull request and sanitize repository data
    const pullRequestsWithReports = await Promise.all(
      result.map(async (row) => {
        const pullRequestReports = await this.getReportsByPullRequest(row.pull_requests.id);
        return {
          ...row.pull_requests,
          repository: {
            id: row.repositories!.id,
            name: row.repositories!.name,
            fullName: row.repositories!.fullName,
            description: row.repositories!.description,
            createdAt: row.repositories!.createdAt,
            updatedAt: row.repositories!.updatedAt,
          } as Repository,
          reports: pullRequestReports
        };
      })
    );

    return pullRequestsWithReports;
  }

  async getReportsByPullRequest(pullRequestId: string): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.pullRequestId, pullRequestId))
      .orderBy(desc(reports.generatedAt));
  }

  async getAllReports(): Promise<(Report & { pullRequest: PullRequest & { repository: Repository } })[]> {
    const result = await db
      .select()
      .from(reports)
      .leftJoin(pullRequests, eq(reports.pullRequestId, pullRequests.id))
      .leftJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
      .orderBy(desc(reports.generatedAt));

    return result.map(row => ({
      ...row.reports,
      pullRequest: {
        ...row.pull_requests!,
        repository: {
          id: row.repositories!.id,
          name: row.repositories!.name,
          fullName: row.repositories!.fullName,
          description: row.repositories!.description,
          createdAt: row.repositories!.createdAt,
          updatedAt: row.repositories!.updatedAt,
        } as Repository
      }
    }));
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report || undefined;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async updateReport(id: string, updates: Partial<InsertReport>): Promise<Report | undefined> {
    const [updated] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();
    return updated || undefined;
  }

  async getReportsCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(reports);
    return result.count;
  }

  async getInsightsByRepository(repositoryId: string): Promise<Insight[]> {
    return await db
      .select()
      .from(insights)
      .where(eq(insights.repositoryId, repositoryId))
      .orderBy(desc(insights.createdAt));
  }

  async createInsight(insight: InsertInsight): Promise<Insight> {
    const [created] = await db.insert(insights).values(insight).returning();
    return created;
  }

  async getRecentInsights(repositoryId?: string): Promise<Insight[]> {
    if (repositoryId) {
      return await db
        .select()
        .from(insights)
        .where(eq(insights.repositoryId, repositoryId))
        .orderBy(desc(insights.createdAt))
        .limit(10);
    }
    
    return await db
      .select()
      .from(insights)
      .orderBy(desc(insights.createdAt))
      .limit(10);
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates).orderBy(desc(reportTemplates.createdAt));
  }

  async getReportTemplatesByAudience(audienceType: string): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.audienceType, audienceType))
      .orderBy(desc(reportTemplates.createdAt));
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    return template || undefined;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [created] = await db.insert(reportTemplates).values(template).returning();
    return created;
  }

  async updateReportTemplate(id: string, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    const [updated] = await db
      .update(reportTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reportTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteReportTemplate(id: string): Promise<boolean> {
    const result = await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getDefaultTemplates(): Promise<ReportTemplate[]> {
    return await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.isDefault, true))
      .orderBy(reportTemplates.audienceType);
  }

  async getRepositoryReports(repositoryId: string): Promise<RepositoryReport[]> {
    return await db
      .select()
      .from(repositoryReports)
      .where(eq(repositoryReports.repositoryId, repositoryId))
      .orderBy(desc(repositoryReports.generatedAt));
  }

  async getAllRepositoryReports(): Promise<(RepositoryReport & { repository: Repository })[]> {
    const result = await db
      .select()
      .from(repositoryReports)
      .leftJoin(repositories, eq(repositoryReports.repositoryId, repositories.id))
      .orderBy(desc(repositoryReports.generatedAt));

    return result.map(row => ({
      ...row.repository_reports,
      repository: {
        id: row.repositories!.id,
        name: row.repositories!.name,
        fullName: row.repositories!.fullName,
        description: row.repositories!.description,
        createdAt: row.repositories!.createdAt,
        updatedAt: row.repositories!.updatedAt,
      } as Repository
    }));
  }

  async getRepositoryReport(id: string): Promise<RepositoryReport | undefined> {
    const [report] = await db.select().from(repositoryReports).where(eq(repositoryReports.id, id));
    return report || undefined;
  }

  async createRepositoryReport(report: InsertRepositoryReport): Promise<RepositoryReport> {
    const [created] = await db.insert(repositoryReports).values(report).returning();
    return created;
  }

  async updateRepositoryReport(id: string, updates: Partial<InsertRepositoryReport>): Promise<RepositoryReport | undefined> {
    const [updated] = await db
      .update(repositoryReports)
      .set(updates)
      .where(eq(repositoryReports.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRepositoryReport(id: string): Promise<boolean> {
    const result = await db.delete(repositoryReports).where(eq(repositoryReports.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getStatistics() {
    const [activePRsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pullRequests)
      .where(eq(pullRequests.status, 'open'));

    const [reportsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports);

    const [reposResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(repositories);

    // Count test scenarios from QA reports
    const [testScenariosResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(eq(reports.audienceType, 'qa'));

    return {
      activePRs: Number(activePRsResult.count),
      reportsGenerated: Number(reportsResult.count),
      connectedRepos: Number(reposResult.count),
      testScenariosGenerated: Number(testScenariosResult.count) * 5, // Estimate 5 scenarios per QA report
    };
  }
}

export const storage = new DatabaseStorage();
