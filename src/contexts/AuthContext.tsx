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
  const [fetchingProfile, setFetchingProfile] = useState(false);

  const fetchProfileSafely = async (userId: string) => {
    if (fetchingProfile) return null;
    setFetchingProfile(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn("Profile fetch failed, creating default:", error);
        return { id: userId, role: 'user' as const };
      }

      if (!profile) {
        // Try to create profile
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId, role: 'user' })
          .select('id, role')
          .single();

        if (insertError) {
          console.warn("Failed to create profile:", insertError);
          return { id: userId, role: 'user' as const };
        }
        
        return newProfile as Profile;
      }

      return profile as Profile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return { id: userId, role: 'user' as const };
    } finally {
      setFetchingProfile(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await fetchProfileSafely(currentUser.id);
          if (mounted) {
            setProfile(userProfile);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
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

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN') {
          // Prevent reload loop - just update the state
          const newUser = session?.user ?? null;
          setUser(newUser);
          if (newUser) {
            fetchProfileSafely(newUser.id).then(userProfile => {
              if (mounted) {
                setProfile(userProfile);
              }
            });
          }
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
