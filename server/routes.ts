import type { Express } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import { storage } from "./storage";
import { githubService } from "./services/github";
import { geminiService } from "./services/gemini";
import { pdfService } from "./services/pdf";
import { insertRepositorySchema, insertReportSchema, insertReportTemplateSchema, insertRepositoryReportSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Repository routes
  app.get("/api/repositories", async (req, res) => {
    try {
      const repositories = await storage.getRepositories();
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  app.post("/api/repositories", async (req, res) => {
    try {
      const validatedData = insertRepositorySchema.parse(req.body);
      
      // Check for demo mode tokens
      const isDemoMode = validatedData.githubToken === "demo" || 
                        validatedData.githubToken === "test" ||
                        validatedData.fullName.toLowerCase().includes("demo");
      
      if (isDemoMode) {
        // Create repository without GitHub validation for demo mode
        console.log("Demo mode: Creating repository without GitHub validation");
        const repository = await storage.createRepository({
          ...validatedData,
          githubToken: "demo-token-not-real"
        });
        
        // Create some demo pull requests for testing with unique GitHub IDs
        const baseGithubId = Math.floor(Math.random() * 1000000000); // Generate random base ID
        const demoPRs = [
          {
            repositoryId: repository.id,
            number: 101,
            title: "Add new authentication feature",
            authorName: "demo-user",
            authorAvatar: "https://github.com/demo-user.png",
            status: "open",
            reviewStatus: "pending",
            githubId: baseGithubId + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            changes: JSON.stringify({
              files: [
                {
                  filename: "auth.js",
                  additions: 45,
                  deletions: 12,
                  patch: "@@ -1,3 +1,10 @@\n+// New authentication system\n+const auth = require('./auth-service');\n+\n export default function authenticate(req, res, next) {"
                }
              ]
            })
          },
          {
            repositoryId: repository.id,
            number: 102,
            title: "Fix bug in user dashboard",
            authorName: "demo-dev",
            authorAvatar: "https://github.com/demo-dev.png", 
            status: "open",
            reviewStatus: "approved",
            githubId: baseGithubId + 2,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            changes: JSON.stringify({
              files: [
                {
                  filename: "dashboard.jsx",
                  additions: 8,
                  deletions: 3,
                  patch: "@@ -15,7 +15,7 @@ function Dashboard() {\n-  const [loading, setLoading] = useState(true);\n+  const [loading, setLoading] = useState(false);"
                }
              ]
            })
          }
        ];
        
        // Add demo pull requests to storage
        for (const pr of demoPRs) {
          await storage.createPullRequest(pr);
        }
        
        return res.json(repository);
      }
      
      // Normal mode: Test GitHub token and repository access
      const isValid = await githubService.validateRepository(
        validatedData.githubToken,
        validatedData.fullName
      );
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid GitHub token or repository access" });
      }

      const repository = await storage.createRepository(validatedData);
      
      // Sync initial pull requests
      try {
        await githubService.syncPullRequests(repository.id, repository.githubToken, repository.fullName);
      } catch (syncError) {
        console.error("Error syncing initial PRs:", syncError);
        // Don't fail repository creation if sync fails
      }

      res.json(repository);
    } catch (error) {
      console.error("Error creating repository:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create repository" });
    }
  });

  app.delete("/api/repositories/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRepository(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Repository not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting repository:", error);
      res.status(500).json({ message: "Failed to delete repository" });
    }
  });

  // Pull request routes
  app.get("/api/pull-requests", async (req, res) => {
    try {
      const pullRequests = await storage.getRecentPullRequests(20);
      res.json(pullRequests);
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      res.status(500).json({ message: "Failed to fetch pull requests" });
    }
  });

  app.get("/api/repositories/:id/pull-requests", async (req, res) => {
    try {
      const pullRequests = await storage.getPullRequestsByRepository(req.params.id);
      res.json(pullRequests);
    } catch (error) {
      console.error("Error fetching repository pull requests:", error);
      res.status(500).json({ message: "Failed to fetch pull requests" });
    }
  });

  // Sync pull requests for a repository
  app.post("/api/repositories/:id/sync", async (req, res) => {
    try {
      const repository = await storage.getRepository(req.params.id);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      await githubService.syncPullRequests(repository.id, repository.githubToken, repository.fullName);
      res.json({ success: true });
    } catch (error) {
      console.error("Error syncing pull requests:", error);
      res.status(500).json({ message: "Failed to sync pull requests" });
    }
  });

  // Report routes
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching all reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/pull-requests/:id/reports", async (req, res) => {
    try {
      const reports = await storage.getReportsByPullRequest(req.params.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/pull-requests/:id/reports", async (req, res) => {
    try {
      const { audienceType, templateId } = req.body;
      
      if (!["pm", "qa", "client"].includes(audienceType)) {
        return res.status(400).json({ message: "Invalid audience type" });
      }

      const pullRequest = await storage.getPullRequest(req.params.id);
      if (!pullRequest) {
        return res.status(404).json({ message: "Pull request not found" });
      }

      const repository = await storage.getRepository(pullRequest.repositoryId);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Get template if specified
      let template = undefined;
      if (templateId) {
        template = await storage.getReportTemplate(templateId);
        if (!template) {
          return res.status(404).json({ message: "Template not found" });
        }
        // Ensure template audience type matches request
        if (template.audienceType !== audienceType) {
          return res.status(400).json({ message: "Template audience type does not match request" });
        }
      }

      // Check if this is a demo repository
      const isDemoRepo = repository.githubToken === "demo-token-not-real" || 
                        repository.fullName.toLowerCase().includes("demo") ||
                        repository.githubToken === "demo" || 
                        repository.githubToken === "test";

      let prDetails;
      if (isDemoRepo) {
        // Use mock data for demo repositories
        prDetails = {
          id: pullRequest.githubId || 12345,
          number: pullRequest.number,
          title: pullRequest.title,
          user: {
            login: pullRequest.authorName,
            avatar_url: pullRequest.authorAvatar || "https://github.com/demo-user.png"
          },
          state: pullRequest.status,
          created_at: pullRequest.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: pullRequest.updatedAt?.toISOString() || new Date().toISOString(),
          merged_at: pullRequest.mergedAt?.toISOString() || null,
          diff_url: `https://github.com/${repository.fullName}/pull/${pullRequest.number}.diff`,
          review_comments: [],
          changes: pullRequest.changes ? (typeof pullRequest.changes === 'string' ? JSON.parse(pullRequest.changes) : pullRequest.changes) : {
            additions: 25,
            deletions: 8,
            changed_files: 3,
            files: [
              {
                filename: "src/auth/login.js",
                status: "modified",
                additions: 15,
                deletions: 3,
                patch: "@@ -1,3 +1,10 @@\n+// Enhanced authentication system\n+const bcrypt = require('bcrypt');\n+\n export function validateLogin(username, password) {"
              },
              {
                filename: "src/components/Dashboard.jsx",
                status: "modified",
                additions: 8,
                deletions: 2,
                patch: "@@ -15,7 +15,7 @@ function Dashboard() {\n-  const [isLoading, setLoading] = useState(true);\n+  const [isLoading, setLoading] = useState(false);"
              },
              {
                filename: "tests/auth.test.js",
                status: "added",
                additions: 2,
                deletions: 3,
                patch: "@@ +1,12 @@\n+describe('Authentication', () => {\n+  test('should validate user credentials', () => {\n+    // Test implementation\n+  });\n+});"
              }
            ],
            diff: `diff --git a/src/auth/login.js b/src/auth/login.js\nindex 1234567..abcdefg 100644\n--- a/src/auth/login.js\n+++ b/src/auth/login.js\n@@ -1,3 +1,10 @@\n+// Enhanced authentication system\n+const bcrypt = require('bcrypt');\n+\n export function validateLogin(username, password) {\n   // Authentication logic\n }`
          }
        };
      } else {
        // Use real GitHub API for non-demo repositories
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
          return res.status(500).json({ message: "GitHub token not configured" });
        }
        
        prDetails = await githubService.getPullRequestDetails(
          githubToken,
          repository.fullName,
          pullRequest.number
        );
      }

      // Generate content using Gemini AI with optional template
      const content = await geminiService.generateReportContent(prDetails, audienceType, template);

      // Create report record
      const report = await storage.createReport({
        pullRequestId: req.params.id,
        audienceType,
        content,
      });

      // Generate PDF
      const pdfPath = await pdfService.generatePDF(report.id, content, audienceType);
      
      // Update report with PDF path
      const updatedReport = await storage.updateReport(report.id, { pdfPath });

      res.json(updatedReport || report);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Repository report generation
  app.post("/api/repositories/:id/reports", async (req, res) => {
    try {
      const { reportType = "mvp_summary", title, templateId } = req.body;
      
      const repository = await storage.getRepository(req.params.id);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }

      // Get all pull requests for the repository
      const pullRequests = await storage.getPullRequestsByRepository(req.params.id);
      if (pullRequests.length === 0) {
        return res.status(400).json({ message: "No pull requests found for repository. Please sync the repository first." });
      }

      // Check if this is a demo repository
      const isDemoRepo = repository.githubToken === "demo-token-not-real" || 
                        repository.fullName.toLowerCase().includes("demo") ||
                        repository.githubToken === "demo" || 
                        repository.githubToken === "test";

      // Create repository summary data for report generation
      const repositoryData = {
        repository: {
          name: repository.name,
          fullName: repository.fullName,
          totalPRs: pullRequests.length,
          openPRs: pullRequests.filter(pr => pr.status === 'open').length,
          closedPRs: pullRequests.filter(pr => pr.status === 'closed').length,
          mergedPRs: pullRequests.filter(pr => pr.status === 'merged').length,
        },
        pullRequests: pullRequests.map(pr => ({
          number: pr.number,
          title: pr.title,
          author: pr.authorName,
          status: pr.status,
          reviewStatus: pr.reviewStatus || undefined,
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
          mergedAt: pr.mergedAt
        })),
        summary: {
          activeFeatures: pullRequests.filter(pr => pr.status === 'open').length,
          completedFeatures: pullRequests.filter(pr => pr.status === 'merged').length,
          totalContributors: Array.from(new Set(pullRequests.map(pr => pr.authorName))).length,
          lastActivity: pullRequests.length > 0 ? pullRequests[0].updatedAt : new Date()
        }
      };

      // Generate repository report content using Gemini AI
      const content = await geminiService.generateRepositoryReportContent(
        repositoryData, 
        reportType,
        templateId ? await storage.getReportTemplate(templateId) : undefined
      );

      // Create repository report record
      const report = await storage.createRepositoryReport({
        repositoryId: req.params.id,
        reportType,
        title: title || `${repository.name} MVP Summary Report`,
        content,
        templateId
      });

      // Generate PDF
      const pdfPath = await pdfService.generatePDF(report.id, content, 'repository');
      
      // Update report with PDF path
      const updatedReport = await storage.updateRepositoryReport(report.id, { pdfPath });

      res.json(updatedReport || report);
    } catch (error) {
      console.error("Error generating repository report:", error);
      res.status(500).json({ message: "Failed to generate repository report" });
    }
  });

  // Get repository reports
  app.get("/api/repositories/:id/reports", async (req, res) => {
    try {
      const reports = await storage.getRepositoryReports(req.params.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching repository reports:", error);
      res.status(500).json({ message: "Failed to fetch repository reports" });
    }
  });

  // Get all repository reports
  app.get("/api/repository-reports", async (req, res) => {
    try {
      const reports = await storage.getAllRepositoryReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching all repository reports:", error);
      res.status(500).json({ message: "Failed to fetch repository reports" });
    }
  });

  // Preview report (inline HTML)
  app.get("/api/reports/:id/preview", async (req, res) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report || !report.content) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Regenerate HTML with emoji replacements from stored content
      if (typeof report.content === 'object' && 'title' in report.content) {
        try {
          // Use PDF service to generate HTML with emoji replacements
          const html = await pdfService.generateHTML(report.id, report.content as any, report.audienceType);
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        } catch (htmlError) {
          console.error("Error regenerating HTML for preview:", htmlError);
          // Fall back to original file-based approach if regeneration fails
        }
      }

      // Fallback: serve existing HTML file if regeneration fails
      const htmlPath = report.pdfPath ? 
        (report.pdfPath.endsWith('.pdf') ? report.pdfPath.replace('.pdf', '.html') : report.pdfPath) :
        null;
      
      if (htmlPath && fs.existsSync(htmlPath)) {
        res.setHeader('Content-Type', 'text/html');
        return res.sendFile(htmlPath, { root: '/' });
      }

      return res.status(404).json({ message: "Preview file not found" });
    } catch (error) {
      console.error("Error previewing report:", error);
      res.status(500).json({ message: "Failed to preview report" });
    }
  });

  // Download report
  app.get("/api/reports/:id/download", async (req, res) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report || !report.pdfPath) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Check if we have a valid PDF file
      const hasPdf = report.pdfPath.endsWith('.pdf') && fs.existsSync(report.pdfPath);
      
      if (!hasPdf) {
        // Legacy report or PDF doesn't exist - try to regenerate from content
        if (report.content && typeof report.content === 'object' && 'title' in report.content) {
          try {
            // Regenerate PDF from existing content
            const pdfPath = await pdfService.generatePDF(report.id, report.content as any, report.audienceType);
            await storage.updateReport(report.id, { pdfPath });
            
            // Now serve the PDF
            const filename = `report-${report.id}-${report.audienceType}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            return res.download(pdfPath, filename);
          } catch (pdfError) {
            console.error("Error regenerating PDF:", pdfError);
            // Fall back to HTML if PDF generation fails
            const htmlPath = report.pdfPath.endsWith('.html') ? report.pdfPath : report.pdfPath.replace('.pdf', '.html');
            if (fs.existsSync(htmlPath)) {
              const filename = `report-${report.id}-${report.audienceType}.html`;
              res.setHeader('Content-Type', 'text/html');
              return res.download(htmlPath, filename);
            } else {
              return res.status(404).json({ message: "Report file not found" });
            }
          }
        } else {
          // No content to regenerate from, try to serve HTML if it exists
          const htmlPath = report.pdfPath.endsWith('.html') ? report.pdfPath : report.pdfPath.replace('.pdf', '.html');
          if (fs.existsSync(htmlPath)) {
            const filename = `report-${report.id}-${report.audienceType}.html`;
            res.setHeader('Content-Type', 'text/html');
            return res.download(htmlPath, filename);
          } else {
            return res.status(404).json({ message: "Report file not found" });
          }
        }
      }

      // Set proper filename for download - now as PDF
      const filename = `report-${report.id}-${report.audienceType}.pdf`;
      
      // Set proper content type for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.download(report.pdfPath, filename);
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ message: "Failed to download report" });
    }
  });

  // Insights routes
  app.get("/api/insights", async (req, res) => {
    try {
      const { repositoryId } = req.query;
      const insights = await storage.getRecentInsights(repositoryId as string);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  app.post("/api/insights/refresh", async (req, res) => {
    try {
      const { repositoryId } = req.body;
      
      if (repositoryId) {
        const repository = await storage.getRepository(repositoryId);
        if (!repository) {
          return res.status(404).json({ message: "Repository not found" });
        }

        const recentPRs = await storage.getPullRequestsByRepository(repositoryId);
        const insights = await geminiService.generateInsights(recentPRs);
        
        // Save insights to database
        for (const insight of insights) {
          await storage.createInsight({
            repositoryId,
            ...insight
          });
        }
      }

      const insights = await storage.getRecentInsights(repositoryId);
      res.json(insights);
    } catch (error) {
      console.error("Error refreshing insights:", error);
      res.status(500).json({ message: "Failed to refresh insights" });
    }
  });

  // Report Templates routes
  app.get("/api/report-templates", async (req, res) => {
    try {
      const { audienceType } = req.query;
      let templates;
      
      if (audienceType) {
        templates = await storage.getReportTemplatesByAudience(audienceType as string);
      } else {
        templates = await storage.getReportTemplates();
      }
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching report templates:", error);
      res.status(500).json({ message: "Failed to fetch report templates" });
    }
  });

  app.get("/api/report-templates/defaults", async (req, res) => {
    try {
      const templates = await storage.getDefaultTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching default templates:", error);
      res.status(500).json({ message: "Failed to fetch default templates" });
    }
  });

  app.get("/api/report-templates/:id", async (req, res) => {
    try {
      const template = await storage.getReportTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching report template:", error);
      res.status(500).json({ message: "Failed to fetch report template" });
    }
  });

  app.post("/api/report-templates", async (req, res) => {
    try {
      const validatedData = insertReportTemplateSchema.parse(req.body);
      const template = await storage.createReportTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error creating report template:", error);
      res.status(500).json({ message: "Failed to create report template" });
    }
  });

  app.put("/api/report-templates/:id", async (req, res) => {
    try {
      const updateData = insertReportTemplateSchema.partial().parse(req.body);
      const template = await storage.updateReportTemplate(req.params.id, updateData);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error updating report template:", error);
      res.status(500).json({ message: "Failed to update report template" });
    }
  });

  app.delete("/api/report-templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteReportTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting report template:", error);
      res.status(500).json({ message: "Failed to delete report template" });
    }
  });

  // Statistics route
  app.get("/api/statistics", async (req, res) => {
    try {
      const stats = await storage.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
