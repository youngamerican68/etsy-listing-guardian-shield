
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
    if (!email) return;
    setIsLoading(true);

    try {
      // Get the current user's session to pass their JWT for authorization
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error("You must be logged in to perform this action.");
      }

      // Securely invoke the edge function, passing the JWT in the Authorization header.
      const { data, error } = await supabase.functions.invoke('make-admin', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: { email },
      });

      if (error) {
        // The function's response error is often in the context object
        throw new Error(error.context?.message || error.message);
      }

      toast({
        title: "Success",
        description: data.message || `The operation was successful.`,
      });
      setEmail('');

    } catch (error: any) {
      console.error('Error making user admin:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
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
