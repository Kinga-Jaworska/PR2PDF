import { storage } from "../storage";
import type { InsertPullRequest } from "@shared/schema";

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  state: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  diff_url: string;
  review_comments: any[];
}

export interface GitHubPRDetails extends GitHubPR {
  changes: {
    additions: number;
    deletions: number;
    changed_files: number;
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string;
    }>;
  };
}

class GitHubService {
  private async makeRequest(token: string, url: string) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PR-Insight-App'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async validateRepository(token: string, fullName: string): Promise<boolean> {
    try {
      await this.makeRequest(token, `https://api.github.com/repos/${fullName}`);
      return true;
    } catch (error) {
      console.error("Repository validation failed:", error);
      return false;
    }
  }

  async syncPullRequests(repositoryId: string, token: string, fullName: string): Promise<void> {
    try {
      const prs: GitHubPR[] = await this.makeRequest(
        token, 
        `https://api.github.com/repos/${fullName}/pulls?state=all&sort=updated&direction=desc&per_page=50`
      );

      for (const pr of prs) {
        // Check if PR already exists
        const existingPR = await storage.getPullRequestByGithubId(pr.id);
        
        const prData: InsertPullRequest = {
          repositoryId,
          number: pr.number,
          title: pr.title,
          authorName: pr.user.login,
          authorAvatar: pr.user.avatar_url,
          status: pr.state,
          reviewStatus: this.determineReviewStatus(pr),
          createdAt: new Date(pr.created_at),
          updatedAt: new Date(pr.updated_at),
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          githubId: pr.id,
          changes: null, // Will be populated when generating reports
        };

        if (existingPR) {
          await storage.updatePullRequest(existingPR.id, prData);
        } else {
          await storage.createPullRequest(prData);
        }
      }
    } catch (error) {
      console.error("Error syncing pull requests:", error);
      throw error;
    }
  }

  async getPullRequestDetails(token: string, fullName: string, number: number): Promise<GitHubPRDetails> {
    try {
      // Get basic PR info
      const pr: GitHubPR = await this.makeRequest(
        token,
        `https://api.github.com/repos/${fullName}/pulls/${number}`
      );

      // Get PR files/changes
      const files = await this.makeRequest(
        token,
        `https://api.github.com/repos/${fullName}/pulls/${number}/files`
      );

      // Get diff content
      const diffResponse = await fetch(`https://api.github.com/repos/${fullName}/pulls/${number}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3.diff',
          'User-Agent': 'PR-Insight-App'
        }
      });

      const diffContent = await diffResponse.text();

      const changes = {
        additions: files.reduce((sum: number, file: any) => sum + file.additions, 0),
        deletions: files.reduce((sum: number, file: any) => sum + file.deletions, 0),
        changed_files: files.length,
        files: files.map((file: any) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch
        })),
        diff: diffContent
      };

      return {
        ...pr,
        changes
      };
    } catch (error) {
      console.error("Error getting PR details:", error);
      throw error;
    }
  }

  private determineReviewStatus(pr: GitHubPR): string {
    if (pr.state === 'closed' && !pr.merged_at) {
      return 'closed';
    }
    if (pr.merged_at) {
      return 'merged';
    }
    
    // For simplicity, we'll determine this based on review comments
    // In a real implementation, you'd check the reviews endpoint
    if (pr.review_comments && pr.review_comments.length > 0) {
      return 'changes_requested';
    }
    
    return 'pending';
  }
}

export const githubService = new GitHubService();
