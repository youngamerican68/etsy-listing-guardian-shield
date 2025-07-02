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
  signIn: (email: string, password:string) => Promise<any>;
  signUp: (email: string, password:string) => Promise<any>;
  signOut: () => Promise<any>;
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
          // Directly query the profiles table instead of using Edge Function
          let { data: profile, error } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (error) throw error;

          // If no profile exists, create one with default user role
          if (!profile) {
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert({ id: currentUser.id, role: 'user' })
              .select('id, role')
              .single();

            if (insertError) throw insertError;
            profile = newProfile;
          }

          setProfile(profile as Profile);

        } catch (error) {
          console.error("Error fetching user profile:", error);
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

  // --- ADD THESE FUNCTIONS BACK ---
  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };
  // --- END OF ADDED FUNCTIONS ---

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signIn, // Add to value
    signUp, // Add to value
    signOut // Add to value
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
