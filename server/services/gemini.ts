import { GoogleGenAI } from "@google/genai";
import type { GitHubPRDetails } from "./github";
import type { PullRequest, ReportTemplate, RepositoryReportInput } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface ReportSection {
  title: string;
  content: string;
  items?: string[];
}

interface ReportContent {
  title: string;
  summary: string;
  sections: ReportSection[];
  recommendations?: string[];
  testScenarios?: string[];
}

interface InsightData {
  type: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "error";
}

class GeminiService {
  async generateReportContent(prDetails: GitHubPRDetails, audienceType: string, template?: ReportTemplate): Promise<ReportContent> {
    try {
      const systemPrompt = template 
        ? this.getSystemPromptFromTemplate(template)
        : this.getSystemPromptForAudience(audienceType);
      
      const prompt = `
Analyze the following pull request and generate a comprehensive report:

**Pull Request Information:**
- Title: ${prDetails.title}
- Author: ${prDetails.user.login}
- State: ${prDetails.state}
- Files Changed: ${prDetails.changes.changed_files}
- Additions: ${prDetails.changes.additions}
- Deletions: ${prDetails.changes.deletions}

**Changed Files:**
${prDetails.changes.files.map(file => `
- ${file.filename} (${file.status})
  - +${file.additions} -${file.deletions}
`).join('')}

**Code Changes:**
${prDetails.changes.files.map(file => file.patch).filter(Boolean).join('\n\n') || 'No diff available'}

Generate a detailed report following the system instructions.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    items: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["title", "content"]
                }
              },
              recommendations: {
                type: "array",
                items: { type: "string" }
              },
              testScenarios: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["title", "summary", "sections"]
          }
        },
        contents: prompt,
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("Empty response from Gemini");
      }

      const content: ReportContent = JSON.parse(rawJson);
      return content;
    } catch (error) {
      console.error("Error generating report content:", error);
      throw new Error(`Failed to generate report content: ${error}`);
    }
  }

  async generateInsights(pullRequests: PullRequest[]): Promise<InsightData[]> {
    try {
      if (pullRequests.length === 0) {
        return [];
      }

      const systemPrompt = `
You are an expert software development analyst. Analyze the provided pull requests and generate actionable insights about the codebase health, potential risks, and recommendations.

Focus on:
1. Code quality and maintainability issues
2. Performance implications
3. Security concerns
4. Testing coverage needs
5. Breaking changes or compatibility issues
6. Development workflow patterns

For each insight, determine the severity level:
- "info": General observations or positive patterns
- "warning": Potential issues that should be monitored
- "error": Critical issues requiring immediate attention

Provide 3-5 most important insights.
`;

      const prSummary = pullRequests.slice(0, 10).map(pr => `
PR #${pr.number}: ${pr.title}
- Status: ${pr.status}
- Author: ${pr.authorName}
- Files changed: ${pr.changes ? JSON.stringify(pr.changes).length > 100 ? 'Multiple files' : 'Few files' : 'Unknown'}
`).join('\n');

      const prompt = `
Analyze these recent pull requests and provide insights:

${prSummary}

Generate insights that will help the development team improve code quality and catch potential issues.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    severity: { 
                      type: "string",
                      enum: ["info", "warning", "error"]
                    }
                  },
                  required: ["type", "title", "description", "severity"]
                }
              }
            },
            required: ["insights"]
          }
        },
        contents: prompt,
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("Empty response from Gemini");
      }

      const result = JSON.parse(rawJson);
      return result.insights || [];
    } catch (error) {
      console.error("Error generating insights:", error);
      throw new Error(`Failed to generate insights: ${error}`);
    }
  }

  async generateRepositoryReportContent(repositoryData: RepositoryReportInput, reportType: string, template?: ReportTemplate): Promise<ReportContent> {
    try {
      let systemPrompt: string;
      if (template && template.templateContent && typeof template.templateContent === 'object') {
        const content = template.templateContent as any;
        systemPrompt = content.systemPrompt || this.getRepositorySystemPrompt(reportType);
      } else {
        systemPrompt = this.getRepositorySystemPrompt(reportType);
      }
      
      const reportTypeDescription = reportType === "client_overview" 
        ? "high-level client overview report" 
        : "comprehensive MVP summary report for clients";
      
      const prompt = `
Analyze the following repository and generate a comprehensive MVP summary report for clients:

**Repository Information:**
- Name: ${repositoryData.repository.name}
- Full Name: ${repositoryData.repository.fullName}
- Total Pull Requests: ${repositoryData.repository.totalPRs}
- Open PRs: ${repositoryData.repository.openPRs}
- Closed PRs: ${repositoryData.repository.closedPRs}
- Merged PRs: ${repositoryData.repository.mergedPRs}

**Development Summary:**
- Active Features: ${repositoryData.summary.activeFeatures}
- Completed Features: ${repositoryData.summary.completedFeatures}
- Contributors: ${repositoryData.summary.totalContributors}
- Last Activity: ${repositoryData.summary.lastActivity}

**Recent Pull Requests:**
${repositoryData.pullRequests.slice(0, 10).map((pr) => `
- PR #${pr.number}: ${pr.title}
  - Author: ${pr.author}
  - Status: ${pr.status} ${pr.reviewStatus ? `(${pr.reviewStatus})` : ''}
  - Created: ${pr.createdAt.toLocaleDateString()}
  ${pr.mergedAt ? `- Merged: ${pr.mergedAt.toLocaleDateString()}` : ''}
`).join('')}

Generate a ${reportTypeDescription} that highlights:
1. Overall project progress and achievements
2. Key features delivered and in development
3. Development velocity and team productivity
4. Quality indicators and code review practices
5. Upcoming milestones and deliverables
6. Risk assessment and mitigation strategies

${reportType === "mvp_summary" ? `
The report sections must include:
- Executive Summary highlighting key achievements
- MVP Progress Overview with completion percentages
- Feature Delivery Analysis with business impact
- Development Quality Assessment
- Team Performance Metrics
- Risk Analysis and Mitigation Plans
- Future Roadmap and Recommendations
` : `
The report sections must include:
- Overall project health and status
- Key deliverables and achievements
- Business impact of completed features
- Timeline adherence and delivery predictability
- Quality assurance and testing coverage
`}

The report should be suitable for client presentation and demonstrate the value delivered.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    items: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["title", "content"]
                }
              },
              recommendations: {
                type: "array",
                items: { type: "string" }
              },
              testScenarios: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["title", "summary", "sections"]
          }
        },
        contents: prompt,
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("Empty response from Gemini");
      }

      const content: ReportContent = JSON.parse(rawJson);
      return content;
    } catch (error) {
      console.error("Error generating repository report content:", error);
      throw new Error(`Failed to generate repository report content: ${error}`);
    }
  }

  private getRepositorySystemPrompt(reportType: string): string {
    const basePrompt = `
You are an expert project analyst specializing in repository analysis and client reporting.
Generate a comprehensive, professional MVP summary report suitable for client presentation.
`;

    switch (reportType) {
      case "mvp_summary":
        return basePrompt + `
Focus on CLIENT/STAKEHOLDER MVP perspective:
- Business value and deliverable achievements
- Feature completion status and progress
- Development velocity and team performance
- Quality metrics and code review practices  
- Risk assessment and mitigation strategies
- Upcoming milestones and next steps
- ROI and success indicators

Structure the report with:
- Executive Summary highlighting key achievements
- MVP Progress Overview with completion percentages
- Feature Delivery Analysis with business impact
- Development Quality Assessment
- Team Performance Metrics
- Risk Analysis and Mitigation Plans
- Future Roadmap and Recommendations

Make it client-friendly with business terminology and clear value propositions.
`;

      case "client_overview":
        return basePrompt + `
Focus on high-level CLIENT OVERVIEW perspective:
- Overall project health and status
- Key deliverables and achievements
- Business impact of completed features
- Timeline adherence and delivery predictability
- Quality assurance and testing coverage
- User feedback and satisfaction metrics

Structure for executive consumption with clear business value.
`;

      default:
        return basePrompt + `
Provide a comprehensive repository analysis suitable for technical stakeholders and clients.
Focus on project progress, quality metrics, and business value delivery.
`;
    }
  }

  private getSystemPromptFromTemplate(template: ReportTemplate): string {
    // Extract system prompt from template content
    if (template.templateContent && typeof template.templateContent === 'object') {
      const content = template.templateContent as any;
      if (content.systemPrompt) {
        return content.systemPrompt;
      }
    }
    
    // Fallback to audience-based prompt if template doesn't have a system prompt
    return this.getSystemPromptForAudience(template.audienceType);
  }

  private getSystemPromptForAudience(audienceType: string): string {
    const basePrompt = `
You are an expert technical analyst specializing in pull request analysis and documentation. 
Generate a comprehensive, professional report based on the provided pull request data.
`;

    switch (audienceType) {
      case "pm":
        return basePrompt + `
Focus on PROJECT MANAGEMENT perspective:
- Business impact and feature delivery
- Timeline implications
- Resource allocation insights
- Risk assessment for project delivery
- User-facing changes and their impact
- Dependencies and blockers
- Integration with project milestones

Structure the report with:
- Executive summary highlighting business value
- Feature impact analysis
- Timeline and resource considerations
- Risk mitigation strategies
- Stakeholder communication points
`;

      case "qa":
        return basePrompt + `
Focus on QUALITY ASSURANCE perspective:
- Detailed test scenarios and test cases
- Edge cases and boundary conditions
- Integration testing requirements
- Performance testing considerations
- Security testing implications
- Regression testing scope
- User acceptance testing scenarios

IMPORTANT: Always include a comprehensive "testScenarios" array with 8-15 specific, actionable test cases.

Structure the report with:
- Testing strategy overview
- Functional testing requirements
- Non-functional testing considerations
- Test environment setup needs
- Risk-based testing prioritization
`;

      case "client":
        return basePrompt + `
Focus on CLIENT/STAKEHOLDER perspective:
- Business value and user benefits
- User experience improvements
- Feature functionality overview
- Impact on existing workflows
- Performance and reliability improvements
- Future roadmap alignment
- Success metrics and outcomes

Structure the report with:
- Business value summary
- User impact analysis
- Feature overview in business terms
- Expected outcomes and benefits
- Next steps and future enhancements
`;

      default:
        return basePrompt + `
Provide a balanced technical and business perspective suitable for a general technical audience.
`;
    }
  }
}

export const geminiService = new GeminiService();
