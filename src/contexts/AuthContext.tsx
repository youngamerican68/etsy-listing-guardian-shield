'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          // --- THIS IS THE CORRECTED PART ---
          // We must explicitly set the Authorization header with the user's token.
          const { data, error } = await supabase.functions.invoke('get-user-profile', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          // --- END OF CORRECTION ---

          if (error) throw error;

          setProfile(data);
        } catch (error) {
          console.error("Error invoking get-user-profile function:", error);
          setProfile(null);
        }
      }
      setLoading(false);
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN') {
          window.location.reload();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
