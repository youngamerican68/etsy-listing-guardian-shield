
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import PolicySectionForm from '@/components/admin/PolicySectionForm';
import PolicySectionList from '@/components/admin/PolicySectionList';

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface PolicySection {
  id: string;
  section_title: string;
  section_content: string;
  plain_english_summary: string | null;
  risk_level: string;
  category: string;
  order_index: number;
}

const AdminPolicySections = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [sections, setSections] = useState<PolicySection[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<PolicySection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      fetchPolicies();
    } else {
      setLoading(false);
    }
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (selectedPolicy) {
      fetchSections(selectedPolicy.id);
    }
  }, [selectedPolicy]);

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('etsy_policies')
        .select('id, title, content, category')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (policyId: string) => {
    try {
      const { data, error } = await supabase
        .from('policy_sections')
        .select('*')
        .eq('policy_id', policyId)
        .order('order_index');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast({
        title: "Error",
        description: "Failed to fetch policy sections",
        variant: "destructive",
      });
    }
  };

  const handlePolicyChange = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    setSelectedPolicy(policy || null);
    setShowForm(false);
    setEditingSection(null);
  };

  const handleAddSection = () => {
    setEditingSection(null);
    setShowForm(true);
  };

  const handleEditSection = (section: PolicySection) => {
    setEditingSection(section);
    setShowForm(true);
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const { error } = await supabase
        .from('policy_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section deleted successfully",
      });

      if (selectedPolicy) {
        fetchSections(selectedPolicy.id);
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSection(null);
    if (selectedPolicy) {
      fetchSections(selectedPolicy.id);
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Policy Sections Management</h1>
      </div>

      <div className="mb-6">
        <Select onValueChange={handlePolicyChange}>
          <SelectTrigger className="w-96">
            <SelectValue placeholder="Select a policy to manage" />
          </SelectTrigger>
          <SelectContent>
            {policies.map((policy) => (
              <SelectItem key={policy.id} value={policy.id}>
                {policy.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPolicy && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[600px]">
          {/* Left Panel - Policy Content */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Policy Content</CardTitle>
              <p className="text-sm text-muted-foreground">{selectedPolicy.title}</p>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto pr-2">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedPolicy.content}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Sections Management */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Policy Sections</CardTitle>
              <Button onClick={handleAddSection} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                {showForm ? (
                  <PolicySectionForm
                    policy={selectedPolicy}
                    section={editingSection}
                    onClose={handleFormClose}
                  />
                ) : (
                  <PolicySectionList
                    sections={sections}
                    onEdit={handleEditSection}
                    onDelete={handleDeleteSection}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedPolicy && (
        <Card className="h-96 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">Select a policy to get started</p>
            <p className="text-sm">
              Choose a policy from the dropdown above to view its content<br />
              and manage its sections.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminPolicySections;
