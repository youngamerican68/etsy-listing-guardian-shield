
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';

interface PolicySection {
  id: string;
  section_title: string;
  section_content: string;
  plain_english_summary: string | null;
  risk_level: string;
  category: string;
  order_index: number;
}

interface PolicySectionListProps {
  sections: PolicySection[];
  onEdit: (section: PolicySection) => void;
  onDelete: (sectionId: string) => void;
}

const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'default';
  }
};

const PolicySectionList = ({ sections, onEdit, onDelete }: PolicySectionListProps) => {
  if (sections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No sections created yet.</p>
        <p className="text-sm">Click "Add Section" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base mb-2">{section.section_title}</CardTitle>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={getRiskLevelColor(section.risk_level)}>
                    {section.risk_level} risk
                  </Badge>
                  <Badge variant="outline">{section.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Order: {section.order_index}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(section)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(section.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {section.plain_english_summary && (
              <div className="mb-3">
                <p className="text-sm font-medium text-muted-foreground mb-1">Summary:</p>
                <p className="text-sm leading-relaxed">{section.plain_english_summary}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Content Preview:</p>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {section.section_content}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PolicySectionList;
