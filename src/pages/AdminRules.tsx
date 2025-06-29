
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ComplianceRule {
  id: string;
  term: string;
  risk_level: 'high' | 'warning';
  reason: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminRules = () => {
  const { isAdmin, loading } = useAuth();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    term: '',
    risk_level: 'warning' as 'high' | 'warning',
    reason: ''
  });

  useEffect(() => {
    if (!loading && isAdmin) {
      fetchRules();
    }
  }, [loading, isAdmin]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch compliance rules",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('compliance_rules')
          .update({
            term: formData.term.toLowerCase(),
            risk_level: formData.risk_level,
            reason: formData.reason
          })
          .eq('id', editingRule.id);

        if (error) throw error;
        toast({ title: "Rule updated successfully" });
      } else {
        // Create new rule
        const { error } = await supabase
          .from('compliance_rules')
          .insert({
            term: formData.term.toLowerCase(),
            risk_level: formData.risk_level,
            reason: formData.reason
          });

        if (error) throw error;
        toast({ title: "Rule created successfully" });
      }

      setFormData({ term: '', risk_level: 'warning', reason: '' });
      setEditingRule(null);
      setIsDialogOpen(false);
      fetchRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save rule",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (rule: ComplianceRule) => {
    setEditingRule(rule);
    setFormData({
      term: rule.term,
      risk_level: rule.risk_level,
      reason: rule.reason
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('compliance_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Rule deleted successfully" });
      fetchRules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('compliance_rules')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchRules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rule status",
        variant: "destructive",
      });
    }
  };

  const openAddDialog = () => {
    setEditingRule(null);
    setFormData({ term: '', risk_level: 'warning', reason: '' });
    setIsDialogOpen(true);
  };

  if (loading || isLoading) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Compliance Rules Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Add New Rule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="term">Term</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="risk_level">Risk Level</Label>
                <Select value={formData.risk_level} onValueChange={(value) => setFormData({ ...formData, risk_level: value as 'high' | 'warning' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRule ? 'Update' : 'Create'} Rule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Compliance Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono">{rule.term}</TableCell>
                  <TableCell>
                    <Badge variant={rule.risk_level === 'high' ? 'destructive' : 'secondary'}>
                      {rule.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.reason}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleActive(rule.id, rule.is_active)}
                      />
                      <span className={rule.is_active ? 'text-green-600' : 'text-gray-400'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRules;
