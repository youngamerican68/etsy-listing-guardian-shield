import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Alert, AlertDescription } from './alert';
import { Badge } from './badge';
import { 
  Edit3, 
  Save, 
  X, 
  Eye, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

interface InlineEditorProps {
  originalContent: {
    title: string;
    description: string;
    tags: string;
    category: string;
    price: string;
  };
  onContentChange: (content: any) => void;
  onReanalyze: (content: string) => Promise<void>;
  onSave: (content: any) => void;
  onCancel: () => void;
  isAnalyzing?: boolean;
  realtimeIssues?: Array<{
    field: string;
    issueCount: number;
    riskLevel: string;
  }>;
}

const InlineEditor: React.FC<InlineEditorProps> = ({
  originalContent,
  onContentChange,
  onReanalyze,
  onSave,
  onCancel,
  isAnalyzing = false,
  realtimeIssues = []
}) => {
  const [editedContent, setEditedContent] = useState(originalContent);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  useEffect(() => {
    const changed = JSON.stringify(editedContent) !== JSON.stringify(originalContent);
    setHasChanges(changed);
    if (changed) {
      onContentChange(editedContent);
    }
  }, [editedContent, originalContent, onContentChange]);

  const handleFieldChange = (field: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const combinedContent = [
        editedContent.title && `Title: ${editedContent.title}`,
        editedContent.description && `Description: ${editedContent.description}`,
        editedContent.tags && `Tags: ${editedContent.tags}`,
        editedContent.category && `Category: ${editedContent.category}`,
        editedContent.price && `Price: ${editedContent.price}`
      ].filter(Boolean).join('\n\n');

      await onReanalyze(combinedContent);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const getFieldStatus = (field: string) => {
    const fieldIssue = realtimeIssues.find(issue => issue.field === field);
    if (!fieldIssue) return 'clean';
    if (fieldIssue.riskLevel === 'critical' || fieldIssue.riskLevel === 'high') return 'error';
    return 'warning';
  };

  const getFieldBorderColor = (field: string) => {
    const status = getFieldStatus(field);
    switch (status) {
      case 'clean':
        return 'border-green-300 focus:border-green-500';
      case 'warning':
        return 'border-yellow-300 focus:border-yellow-500';
      case 'error':
        return 'border-red-300 focus:border-red-500';
      default:
        return 'border-gray-300';
    }
  };

  const getFieldIssueCount = (field: string) => {
    const fieldIssue = realtimeIssues.find(issue => issue.field === field);
    return fieldIssue?.issueCount || 0;
  };

  return (
    <Card className="border-t-4 border-t-blue-500">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Edit3 className="h-5 w-5" />
            Fix Issues Now
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
          </div>
        </div>
        
        {hasChanges && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Click "Save Changes" to apply them or "Re-analyze" to check compliance.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {previewMode ? (
          // Preview Mode
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Preview:</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Title:</strong> {editedContent.title}</div>
                <div><strong>Description:</strong> {editedContent.description}</div>
                <div><strong>Tags:</strong> {editedContent.tags}</div>
                <div><strong>Category:</strong> {editedContent.category}</div>
                <div><strong>Price:</strong> ${editedContent.price}</div>
              </div>
            </div>
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-4">
            {/* Title Field */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </Label>
                {getFieldIssueCount('title') > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {getFieldIssueCount('title')} issues
                  </Badge>
                )}
                {getFieldStatus('title') === 'clean' && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Clean
                  </Badge>
                )}
              </div>
              <Input
                id="edit-title"
                value={editedContent.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className={`transition-colors ${getFieldBorderColor('title')}`}
                placeholder="Enter a descriptive title for your listing"
                maxLength={140}
              />
              <p className="text-xs text-gray-500 mt-1">
                {editedContent.title.length}/140 characters
              </p>
            </div>

            {/* Description Field */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                {getFieldIssueCount('description') > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {getFieldIssueCount('description')} issues
                  </Badge>
                )}
                {getFieldStatus('description') === 'clean' && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Clean
                  </Badge>
                )}
              </div>
              <Textarea
                id="edit-description"
                value={editedContent.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className={`min-h-[120px] transition-colors ${getFieldBorderColor('description')}`}
                placeholder="Describe your item in detail..."
              />
            </div>

            {/* Tags Field */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="edit-tags" className="text-sm font-medium text-gray-700">
                  Tags
                </Label>
                {getFieldIssueCount('tags') > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {getFieldIssueCount('tags')} issues
                  </Badge>
                )}
                {getFieldStatus('tags') === 'clean' && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Clean
                  </Badge>
                )}
              </div>
              <Input
                id="edit-tags"
                value={editedContent.tags}
                onChange={(e) => handleFieldChange('tags', e.target.value)}
                className={`transition-colors ${getFieldBorderColor('tags')}`}
                placeholder="Add relevant tags separated by commas"
              />
            </div>

            {/* Category and Price Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="edit-category" className="text-sm font-medium text-gray-700">
                    Category
                  </Label>
                  {getFieldStatus('category') === 'clean' && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Clean
                    </Badge>
                  )}
                </div>
                <Input
                  id="edit-category"
                  value={editedContent.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className={`transition-colors ${getFieldBorderColor('category')}`}
                  placeholder="Select or type category"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="edit-price" className="text-sm font-medium text-gray-700">
                    Price <span className="text-red-500">*</span>
                  </Label>
                  {getFieldStatus('price') === 'clean' && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Clean
                    </Badge>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedContent.price}
                    onChange={(e) => handleFieldChange('price', e.target.value)}
                    className={`pl-8 transition-colors ${getFieldBorderColor('price')}`}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button
            onClick={handleReanalyze}
            disabled={!hasChanges || isReanalyzing || isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isReanalyzing || isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Re-analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-analyze
              </>
            )}
          </Button>
          
          <Button
            onClick={() => onSave(editedContent)}
            disabled={!hasChanges}
            variant="outline"
            className="border-green-500 text-green-700 hover:bg-green-50"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          
          <Button
            onClick={onCancel}
            variant="outline"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InlineEditor;