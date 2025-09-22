import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Copy, Edit, Trash2, Eye, Users, TestTube, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  description: string;
  type: "pm" | "qa" | "client";
  content: string;
  isDefault: boolean;
  createdAt: Date;
}

export default function TemplatesPage() {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Default templates
  const defaultTemplates: Template[] = [
    {
      id: "pm-default",
      name: "Project Manager Report",
      description: "Comprehensive overview for project managers with timeline and impact analysis",
      type: "pm",
      content: `# Project Manager Report

## Executive Summary
{{summary}}

## Changes Overview
{{changes_summary}}

## Timeline Impact
{{timeline_analysis}}

## Resource Requirements
{{resource_analysis}}

## Risk Assessment
{{risk_assessment}}

## Next Steps
{{next_steps}}`,
      isDefault: true,
      createdAt: new Date()
    },
    {
      id: "qa-default", 
      name: "QA Testing Report",
      description: "Detailed testing scenarios and quality assurance checklist",
      type: "qa",
      content: `# QA Testing Report

## Test Scenarios
{{test_scenarios}}

## Regression Testing
{{regression_tests}}

## Performance Impact
{{performance_analysis}}

## Security Considerations
{{security_checklist}}

## Browser Compatibility
{{compatibility_matrix}}

## Sign-off Criteria
{{acceptance_criteria}}`,
      isDefault: true,
      createdAt: new Date()
    },
    {
      id: "client-default",
      name: "Client Update Report", 
      description: "Client-friendly summary with business value and user impact",
      type: "client",
      content: `# Client Update Report

## What's New
{{feature_summary}}

## Business Value
{{business_impact}}

## User Experience
{{user_benefits}}

## Implementation Status
{{progress_overview}}

## Timeline
{{delivery_schedule}}

## Support Information
{{support_details}}`,
      isDefault: true,
      createdAt: new Date()
    }
  ];

  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    type: "pm" as "pm" | "qa" | "client",
    content: ""
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pm": return <Users className="h-4 w-4" />;
      case "qa": return <TestTube className="h-4 w-4" />;
      case "client": return <UserCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pm": return "Project Manager";
      case "qa": return "QA Team";
      case "client": return "Client";
      default: return "General";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pm": return "default";
      case "qa": return "secondary";
      case "client": return "outline";
      default: return "default";
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in template name and content.",
        variant: "destructive",
      });
      return;
    }

    const template: Template = {
      id: Date.now().toString(),
      ...newTemplate,
      isDefault: false,
      createdAt: new Date()
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: "", description: "", type: "pm", content: "" });
    setIsCreateModalOpen(false);

    toast({
      title: "Template created",
      description: "Your new report template has been created successfully.",
    });
  };

  const handleDuplicateTemplate = (template: Template) => {
    const duplicated: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date()
    };

    setTemplates([...templates, duplicated]);

    toast({
      title: "Template duplicated",
      description: "Template has been duplicated successfully.",
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.isDefault) {
      toast({
        title: "Cannot delete",
        description: "Default templates cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    setTemplates(templates.filter(t => t.id !== templateId));
    toast({
      title: "Template deleted",
      description: "Template has been deleted successfully.",
    });
  };

  const handlePreviewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const groupedTemplates = {
    pm: templates.filter(t => t.type === "pm"),
    qa: templates.filter(t => t.type === "qa"),
    client: templates.filter(t => t.type === "client")
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-templates-title">
            Report Templates
          </h1>
          <p className="text-muted-foreground">
            Create and manage templates for generating AI-powered reports.
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a custom report template for generating AI-powered reports.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="e.g., Custom PM Report"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Brief description of the template purpose"
                  data-testid="input-template-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-type">Template Type</Label>
                <Select 
                  value={newTemplate.type} 
                  onValueChange={(value) => setNewTemplate({...newTemplate, type: value as "pm" | "qa" | "client"})}
                >
                  <SelectTrigger data-testid="select-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pm">Project Manager</SelectItem>
                    <SelectItem value="qa">QA Team</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-content">Template Content</Label>
                <Textarea
                  id="template-content"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                  placeholder="Enter your template content using {{variable}} for dynamic content..."
                  rows={8}
                  data-testid="textarea-template-content"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} data-testid="button-save-template">
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates by Type */}
      <Tabs defaultValue="pm" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pm" data-testid="tab-pm-templates">
            <Users className="mr-2 h-4 w-4" />
            PM Templates ({groupedTemplates.pm.length})
          </TabsTrigger>
          <TabsTrigger value="qa" data-testid="tab-qa-templates">
            <TestTube className="mr-2 h-4 w-4" />
            QA Templates ({groupedTemplates.qa.length})
          </TabsTrigger>
          <TabsTrigger value="client" data-testid="tab-client-templates">
            <UserCheck className="mr-2 h-4 w-4" />
            Client Templates ({groupedTemplates.client.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {typeTemplates.map((template) => (
                <Card key={template.id} className="relative" data-testid={`card-template-${template.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(template.type)}
                        <span data-testid={`text-template-name-${template.id}`}>
                          {template.name}
                        </span>
                      </div>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getTypeColor(template.type)} data-testid={`badge-template-type-${template.id}`}>
                        {getTypeLabel(template.type)}
                      </Badge>
                      {template.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <CardDescription data-testid={`text-template-description-${template.id}`}>
                        {template.description}
                      </CardDescription>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreviewTemplate(template)}
                            data-testid={`button-preview-${template.id}`}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateTemplate(template)}
                            data-testid={`button-duplicate-${template.id}`}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Duplicate
                          </Button>
                        </div>
                        {!template.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTemplate(template.id)}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview of the template content with variables shown as placeholders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm" data-testid="text-template-preview">
                {selectedTemplate?.content}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPreviewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}