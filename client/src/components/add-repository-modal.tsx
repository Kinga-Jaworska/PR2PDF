import { useState } from "react";
import { Plus, X, Info, ExternalLink, Github } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddRepositoryModal({ isOpen, onClose }: AddRepositoryModalProps) {
  const [formData, setFormData] = useState({
    githubToken: "",
    fullName: "", // Let user fill in the correct format
    defaultBranch: "main",
    autoGenerate: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.githubToken.trim() || !formData.fullName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both GitHub token and repository name.",
        variant: "destructive",
      });
      return;
    }

    // Skip format validation for demo mode
    const isDemoMode = formData.githubToken === "demo" || 
                      formData.githubToken === "test" ||
                      formData.fullName.toLowerCase().includes("demo");

    if (!isDemoMode && !formData.fullName.includes('/')) {
      toast({
        title: "Invalid repository format",
        description: "Repository name must be in format: owner/repository-name (e.g., facebook/react)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Extract repository name from full name or URL
      let fullName = formData.fullName.trim();
      if (fullName.startsWith('https://github.com/')) {
        fullName = fullName.replace('https://github.com/', '');
      }
      
      const repositoryData = {
        name: fullName.split('/')[1] || fullName,
        fullName,
        githubToken: formData.githubToken.trim(),
        defaultBranch: formData.defaultBranch,
        autoGenerate: formData.autoGenerate
      };

      await apiRequest("POST", "/api/repositories", repositoryData);
      await queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });

      toast({
        title: "Repository added",
        description: "Repository has been successfully connected and synced.",
      });

      // Reset form and close modal
      setFormData({
        githubToken: "",
        fullName: "",
        defaultBranch: "main",
        autoGenerate: true
      });
      onClose();
    } catch (error: any) {
      console.error("Error adding repository:", error);
      toast({
        title: "Failed to add repository",
        description: error.message || "Please check your token and repository access.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md" data-testid="modal-add-repository">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Repository
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="github-token" className="text-sm font-medium text-foreground mb-2 block">
              GitHub Personal Access Token
            </Label>
            <Input
              id="github-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxx"
              value={formData.githubToken}
              onChange={(e) => setFormData(prev => ({ ...prev, githubToken: e.target.value }))}
              disabled={isSubmitting}
              data-testid="input-github-token"
            />
            <div className="space-y-1 mt-1">
              <p className="text-xs text-muted-foreground flex items-center">
                <Info className="mr-1 h-3 w-3" />
                Your token is stored securely and never shared
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Required permissions: repo (for private repos) or public_repo (for public repos)
              </p>
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                  🚀 Quick Test: Use "demo" or "test" as token to try the app without GitHub setup
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="repository-name" className="text-sm font-medium text-foreground mb-2 block">
              Repository URL or Name
            </Label>
            <Input
              id="repository-name"
              type="text"
              placeholder="owner/repository-name (e.g., facebook/react)"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              disabled={isSubmitting}
              data-testid="input-repository-name"
            />
            <div className="space-y-1 mt-1">
              <p className="text-xs text-muted-foreground">
                ⚠️ Format must be: <strong>owner/repository-name</strong> (GitHub requires both owner and repo name)
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setFormData(prev => ({ ...prev, fullName: "your-username/Evidence_FE" }))}
                  disabled={isSubmitting}
                  data-testid="button-set-evidence"
                >
                  your-username/Evidence_FE
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setFormData(prev => ({ ...prev, fullName: "facebook/react" }))}
                  disabled={isSubmitting}
                  data-testid="button-set-react"
                >
                  facebook/react (demo)
                </Button>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                💡 Find your repository URL on GitHub: github.com/<strong>owner/repository-name</strong>
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="default-branch" className="text-sm font-medium text-foreground mb-2 block">
              Default Branch
            </Label>
            <Select 
              value={formData.defaultBranch} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, defaultBranch: value }))}
              disabled={isSubmitting}
            >
              <SelectTrigger data-testid="select-default-branch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">main</SelectItem>
                <SelectItem value="master">master</SelectItem>
                <SelectItem value="develop">develop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-generate"
              checked={formData.autoGenerate}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoGenerate: !!checked }))}
              disabled={isSubmitting}
              data-testid="checkbox-auto-generate"
            />
            <Label htmlFor="auto-generate" className="text-sm text-foreground">
              Auto-generate reports for new PRs
            </Label>
          </div>

          <DialogFooter className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-add-repository-submit"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add Repository"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
