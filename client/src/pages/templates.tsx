import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Copy, Edit, Trash2, Eye, Users, TestTube, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ReportTemplate, InsertReportTemplate } from "@shared/schema";

export default function TemplatesPage() {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const [newTemplate, setNewTemplate] = useState<Omit<InsertReportTemplate, "templateContent">>({
    name: "",
    description: "",
    audienceType: "pm",
    isDefault: false,
  });
  
  const [newTemplateContent, setNewTemplateContent] = useState("");

  // Fetch templates from API
  const { data: templates, isLoading } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates"],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: InsertReportTemplate) => {
      return await fetch("/api/report-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      setIsCreateModalOpen(false);
      setNewTemplate({ name: "", description: "", audienceType: "pm", isDefault: false });
      setNewTemplateContent("");
      toast({
        title: "Template created",
        description: "Your new report template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating template",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await fetch(`/api/report-templates/${templateId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "Template deleted",
        description: "Template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting template",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
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
    if (!newTemplate.name.trim() || !newTemplateContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in template name and content.",
        variant: "destructive",
      });
      return;
    }

    const templateData: InsertReportTemplate = {
      ...newTemplate,
      templateContent: {
        systemPrompt: newTemplateContent,
      },
    };

    createTemplateMutation.mutate(templateData);
  };

  const handleDuplicateTemplate = (template: ReportTemplate) => {
    const duplicated: InsertReportTemplate = {
      name: `${template.name} (Copy)`,
      description: template.description,
      audienceType: template.audienceType,
      templateContent: template.templateContent as any, // Cast to avoid type issues
      isDefault: false,
    };

    createTemplateMutation.mutate(duplicated);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template?.isDefault) {
      toast({
        title: "Cannot delete",
        description: "Default templates cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    deleteTemplateMutation.mutate(templateId);
  };

  const handlePreviewTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const groupedTemplates = templates ? {
    pm: templates.filter(t => t.audienceType === "pm"),
    qa: templates.filter(t => t.audienceType === "qa"),
    client: templates.filter(t => t.audienceType === "client")
  } : { pm: [], qa: [], client: [] };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Report Templates</h1>
            <p className="text-muted-foreground">
              Create and manage templates for generating AI-powered reports.
            </p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
                  value={newTemplate.description || ""}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Brief description of the template purpose"
                  data-testid="input-template-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-type">Template Type</Label>
                <Select 
                  value={newTemplate.audienceType} 
                  onValueChange={(value) => setNewTemplate({...newTemplate, audienceType: value as "pm" | "qa" | "client"})}
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
                <Label htmlFor="template-content">System Prompt</Label>
                <Textarea
                  id="template-content"
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="Enter the system prompt for AI report generation..."
                  rows={8}
                  data-testid="textarea-template-content"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTemplate} 
                disabled={createTemplateMutation.isPending}
                data-testid="button-save-template"
              >
                {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
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
            {typeTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No templates yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Create your first {getTypeLabel(type)} template to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {typeTemplates.map((template) => (
                  <Card key={template.id} className="relative" data-testid={`card-template-${template.id}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(template.audienceType)}
                          <span data-testid={`text-template-name-${template.id}`}>
                            {template.name}
                          </span>
                        </div>
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getTypeColor(template.audienceType)} data-testid={`badge-template-type-${template.id}`}>
                          {getTypeLabel(template.audienceType)}
                        </Badge>
                        {template.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <CardDescription data-testid={`text-template-description-${template.id}`}>
                          {template.description || "No description provided"}
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
                              disabled={createTemplateMutation.isPending}
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
                              disabled={deleteTemplateMutation.isPending}
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
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview of the system prompt that will be used for AI report generation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm" data-testid="text-template-preview">
                {selectedTemplate?.templateContent && typeof selectedTemplate.templateContent === 'object' 
                  ? (selectedTemplate.templateContent as any).systemPrompt || "No system prompt defined"
                  : "No template content available"}
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