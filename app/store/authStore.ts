import { create } from 'zustand';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Profile } from '@bonfire/shared';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  subscription: { unsubscribe: () => void } | null;
  setAuth: (user: User | null, session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  cleanup: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,
  subscription: null,

  setAuth: (user, session) => set({ user, session }),

  setProfile: (profile) => set({ profile }),

  setLoading: (loading) => set({ loading }),

  setInitialized: (initialized) => set({ initialized }),

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      set({ user: null, session: null, profile: null });
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  },

  cleanup: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null });
    }
  },

  initialize: async () => {
    const { setAuth, setProfile, setLoading, setInitialized } = get();

    try {
      // Get initial session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw sessionError;
      }

      if (session) {
        setAuth(session.user, session);

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Don't throw - user is authenticated even if profile fetch fails
        } else if (profile) {
          setProfile(profile);
        }
      }

      // Listen for auth changes and store subscription
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setAuth(session?.user ?? null, session);

        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile on auth change:', profileError);
            // Don't throw - user is authenticated even if profile fetch fails
          } else if (profile) {
            setProfile(profile);
          }
        } else {
          setProfile(null);
        }
      });

      // Store subscription for cleanup
      set({ subscription });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      throw error;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  },
}));
