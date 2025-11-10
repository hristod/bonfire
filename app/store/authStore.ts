import { create } from 'zustand';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Profile } from '@bonfire/shared';
import { supabase } from '../lib/supabase';
import { generateNickname, createProfileWithNickname } from '../lib/profile-utils';

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  subscription: { unsubscribe: () => void } | null;
  oauthLoading: boolean;
  pendingNickname: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setOAuthLoading: (loading: boolean) => void;
  setPendingNickname: (pending: boolean) => void;
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
  oauthLoading: false,
  pendingNickname: false,

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

  setOAuthLoading: (loading) => set({ oauthLoading: loading }),

  setPendingNickname: (pending) => set({ pendingNickname: pending }),

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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setAuth(session?.user ?? null, session);

        if (session?.user) {
          // Fetch profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile on auth change:', profileError);
          } else if (profile) {
            setProfile(profile);
            set({ pendingNickname: false });
          } else if (event === 'SIGNED_IN') {
            // No profile exists - this is OAuth sign-up
            // Generate and try to create profile
            const nickname = generateNickname(session.user);
            const created = await createProfileWithNickname(session.user.id, nickname);

            if (created) {
              // Profile created successfully, fetch it
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (newProfile) {
                setProfile(newProfile);
                set({ pendingNickname: false });
              }
            } else {
              // Nickname conflict - need user to choose
              set({ pendingNickname: true });
            }
          }
        } else {
          setProfile(null);
          set({ pendingNickname: false });
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
