import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const MakeAdmin = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMakeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, get the user ID from the email
      const { data: userList, error: userError } = await supabase.auth.admin.listUsers();
      
      // --- FIX 1: Robustly check for both an error and the existence of the data object ---
      // This is the primary fix for the TypeScript 'never' type error.
      if (userError || !userList) {
        console.error('Error fetching users:', userError);
        toast({
          title: "Error",
          description: "Could not fetch the user list. This action likely requires elevated privileges.",
          variant: "destructive",
        });
        return;
      }

      // Now it's safe to access userList.users
      const targetUser = userList.users.find(user => user.email === email);
      
      if (!targetUser) {
        toast({
          title: "User not found",
          description: "No user found with that email address.",
          variant: "destructive",
        });
        return;
      }

      // --- FIX 2: Simplified upsert operation for clarity and efficiency ---
      // We only need the ID to find the profile and the role to update it.
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: targetUser.id,
          role: 'admin'
        });

      if (updateError) {
        console.error('Error updating user role:', updateError);
        toast({
          title: "Error",
          description: "Failed to update user role. Check database policies or constraints.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `User ${email} has been made an admin.`,
        });
        setEmail('');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Make Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MakeAdmin;
