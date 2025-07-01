
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

const MakeAdmin = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMakeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, find the user by email in the profiles table
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();

      if (findError) {
        throw new Error(`Error finding user: ${findError.message}`);
      }

      if (!profile) {
        throw new Error('User not found. Make sure the user has signed up first.');
      }

      if (profile.role === 'admin') {
        toast({ title: "User is already an admin" });
        setLoading(false);
        return;
      }

      // Update the user's role to admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', profile.id);

      if (updateError) {
        throw new Error(`Error updating role: ${updateError.message}`);
      }

      toast({ 
        title: "Success", 
        description: `${email} has been made an admin` 
      });
      setEmail('');
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to make user admin",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Make User Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMakeAdmin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter user email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Processing...' : 'Make Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MakeAdmin;
