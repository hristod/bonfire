import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@bonfire/shared';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  setAuth: (user, session) => set({ user, session }),

  setProfile: (profile) => set({ profile }),

  setLoading: (loading) => set({ loading }),

  setInitialized: (initialized) => set({ initialized }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  initialize: async () => {
    const { setAuth, setProfile, setLoading, setInitialized } = get();

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setAuth(session.user, session);

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setProfile(profile);
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        setAuth(session?.user ?? null, session);

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setProfile(profile);
          }
        } else {
          setProfile(null);
        }
      });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  },
}));
