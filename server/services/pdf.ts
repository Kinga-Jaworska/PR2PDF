import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

interface ReportContent {
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
    items?: string[];
  }>;
  recommendations?: string[];
  testScenarios?: string[];
}

class PDFService {
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async generatePDF(reportId: string, content: ReportContent, audienceType: string): Promise<string> {
    const reportsDir = path.join(process.cwd(), 'reports');
    this.ensureDirectoryExists(reportsDir);

    const pdfFilename = `${reportId}-${audienceType}.pdf`;
    const htmlFilename = `${reportId}-${audienceType}.html`;
    const pdfFilepath = path.join(reportsDir, pdfFilename);
    const htmlFilepath = path.join(reportsDir, htmlFilename);

    const html = this.generateHTMLReport(content, audienceType);
    
    // Generate HTML file for preview
    fs.writeFileSync(htmlFilepath, html, 'utf8');
    
    // Use puppeteer to generate actual PDF
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: pdfFilepath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      return pdfFilepath;
    } finally {
      await browser.close();
    }
  }

  async generateHTML(reportId: string, content: ReportContent, audienceType: string): Promise<string> {
    return this.generateHTMLReport(content, audienceType);
  }

  private generateHTMLReport(content: ReportContent, audienceType: string): string {
    const audienceTypeDisplay = {
      pm: 'Project Manager',
      qa: 'Quality Assurance',
      client: 'Client'
    }[audienceType] || audienceType;

    // Function to replace emojis with readable symbols in text
    const replaceEmojis = (text: string): string => {
      return text
        .replace(/📋/g, '■')  // clipboard emoji -> solid square
        .replace(/💡/g, '★')  // light bulb emoji -> star
        .replace(/📊/g, '▲')  // chart emoji -> triangle
        .replace(/⚠️/g, '⚠')  // warning emoji -> warning symbol
        .replace(/✅/g, '✓')  // check mark emoji -> check mark
        .replace(/❌/g, '✗')  // cross mark emoji -> x mark
        .replace(/🔍/g, '○')  // magnifying glass -> circle
        .replace(/⭐/g, '★')  // star emoji -> star symbol
        .replace(/🚨/g, '!')  // siren emoji -> exclamation
        .replace(/🎯/g, '→'); // target emoji -> arrow
    };

    // Clean content by replacing emojis
    const cleanContent = {
      ...content,
      title: replaceEmojis(content.title),
      summary: replaceEmojis(content.summary),
      sections: content.sections.map(section => ({
        ...section,
        title: replaceEmojis(section.title),
        content: replaceEmojis(section.content),
        items: section.items?.map(item => replaceEmojis(item))
      })),
      recommendations: content.recommendations?.map(rec => replaceEmojis(rec)),
      testScenarios: content.testScenarios?.map(scenario => replaceEmojis(scenario))
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>
        body {
            font-family: 'Arial', 'DejaVu Sans', 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4F46E5;
            margin: 0;
            font-size: 28px;
        }
        .audience-badge {
            background: #4F46E5;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            display: inline-block;
            margin-top: 10px;
        }
        .summary {
            background: #F8FAFC;
            padding: 20px;
            border-left: 4px solid #4F46E5;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #1E293B;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 5px;
        }
        .test-scenarios {
            background: #FEF3C7;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #F59E0B;
        }
        .recommendations {
            background: #ECFDF5;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10B981;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E2E8F0;
            text-align: center;
            color: #6B7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${cleanContent.title}</h1>
        <span class="audience-badge">Report for ${audienceTypeDisplay}</span>
    </div>

    <div class="summary">
        <h2>Executive Summary</h2>
        <p>${cleanContent.summary}</p>
    </div>

    ${cleanContent.sections.map(section => `
        <div class="section">
            <h2>${section.title}</h2>
            <p>${section.content}</p>
            ${section.items ? `
                <ul>
                    ${section.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `).join('')}

    ${cleanContent.testScenarios ? `
        <div class="test-scenarios">
            <h2>■ Recommended Test Scenarios</h2>
            <ul>
                ${cleanContent.testScenarios.map(scenario => `<li>${scenario}</li>`).join('')}
            </ul>
        </div>
    ` : ''}

    ${cleanContent.recommendations ? `
        <div class="recommendations">
            <h2>★ Recommendations</h2>
            <ul>
                ${cleanContent.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}

    <div class="footer">
        <p>Generated by PR Insight • ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;
  }
}

export const pdfService = new PDFService();
