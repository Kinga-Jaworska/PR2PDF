import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { githubService } from "./services/github";
import { geminiService } from "./services/gemini";
import { pdfService } from "./services/pdf";
import { insertRepositorySchema, insertReportSchema } from "@shared/schema";
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
      
      // Test GitHub token and repository access
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
      const { audienceType } = req.body;
      
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

      // Get PR details and changes from GitHub
      const prDetails = await githubService.getPullRequestDetails(
        repository.githubToken,
        repository.fullName,
        pullRequest.number
      );

      // Generate content using Gemini AI
      const content = await geminiService.generateReportContent(prDetails, audienceType);

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

  // Download report PDF
  app.get("/api/reports/:id/download", async (req, res) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report || !report.pdfPath) {
        return res.status(404).json({ message: "Report PDF not found" });
      }

      res.download(report.pdfPath);
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
