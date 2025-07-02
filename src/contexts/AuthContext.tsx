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
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        
        if (!mounted) return;
        setUser(currentUser);

        if (currentUser) {
          // Directly query the profiles table with retry logic
          let profile = null;
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries && !profile && mounted) {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('id, role')
                .eq('id', currentUser.id)
                .maybeSingle();

              if (error) {
                console.warn(`Profile fetch attempt ${retryCount + 1} failed:`, error);
                if (retryCount === maxRetries - 1) throw error;
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                continue;
              }

              profile = profileData;
              break;
            } catch (error) {
              retryCount++;
              if (retryCount >= maxRetries) {
                console.error("Max retries reached for profile fetch:", error);
                // Create a default profile as fallback
                profile = { id: currentUser.id, role: 'user' };
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          // If no profile exists, try to create one
          if (!profile && mounted) {
            try {
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({ id: currentUser.id, role: 'user' })
                .select('id, role')
                .single();

              if (!insertError) {
                profile = newProfile;
              } else {
                console.warn("Failed to create profile:", insertError);
                profile = { id: currentUser.id, role: 'user' };
              }
            } catch (error) {
              console.warn("Error creating profile:", error);
              profile = { id: currentUser.id, role: 'user' };
            }
          }

          if (mounted) {
            setProfile(profile as Profile);
          }
        }
      } catch (error) {
        console.error("Error in auth initialization:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN') {
          window.location.reload();
        }
      }
    );

    return () => {
      mounted = false;
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
