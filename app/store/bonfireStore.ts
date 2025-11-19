import { create } from 'zustand';
import { Bonfire, BonfireMessage, BonfireParticipant } from '@bonfire/shared';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface BonfireStore {
  // Current active bonfire
  activeBonfire: Bonfire | null;
  participants: BonfireParticipant[];
  messages: BonfireMessage[];

  // Loading states
  loading: boolean;
  sending: boolean;

  // Realtime subscription
  channel: RealtimeChannel | null;

  // Actions
  setActiveBonfire: (bonfire: Bonfire | null) => void;
  setParticipants: (participants: BonfireParticipant[]) => void;
  addMessage: (message: BonfireMessage) => void;
  setMessages: (messages: BonfireMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;

  // Realtime subscription management
  subscribeToMessages: (bonfireId: string) => Promise<void>;
  unsubscribe: () => void;

  // Cleanup
  reset: () => Promise<void>;
}

export const useBonfireStore = create<BonfireStore>((set, get) => ({
  activeBonfire: null,
  participants: [],
  messages: [],
  loading: false,
  sending: false,
  channel: null,

  setActiveBonfire: (bonfire) => set({ activeBonfire: bonfire }),

  setParticipants: (participants) => set({ participants }),

  addMessage: (message) =>
    set((state) => {
      // Deduplicate messages by ID
      const exists = state.messages.some(m => m.id === message.id);
      if (exists) return state;

      return {
        messages: [...state.messages, message].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      };
    }),

  setMessages: (messages) =>
    set({
      messages: messages.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }),

  setLoading: (loading) => set({ loading }),

  setSending: (sending) => set({ sending }),

  subscribeToMessages: async (bonfireId: string) => {
    const { channel: existingChannel } = get();

    // Unsubscribe from existing channel
    if (existingChannel) {
      await supabase.removeChannel(existingChannel);
    }

    // Fetch existing messages
    const { data: messages, error } = await supabase
      .from('bonfire_messages')
      .select(`
        *,
        profiles:user_id (
          nickname,
          avatar_url
        )
      `)
      .eq('bonfire_id', bonfireId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('bonfireStore.subscribeToMessages: Error fetching messages:', error);
      throw error;
    }

    if (messages) {
      const formattedMessages = messages.map((msg) => ({
        ...msg,
        sender_nickname: (msg.profiles as any)?.nickname,
        sender_avatar_url: (msg.profiles as any)?.avatar_url,
      }));
      set({ messages: formattedMessages });
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`bonfire:${bonfireId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bonfire_messages',
          filter: `bonfire_id=eq.${bonfireId}`,
        },
        async (payload) => {
          // Fetch the message with profile data
          const { data: newMessage, error: fetchError } = await supabase
            .from('bonfire_messages')
            .select(`
              *,
              profiles:user_id (
                nickname,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (fetchError) {
            console.error('bonfireStore.subscribeToMessages: Error fetching new message:', fetchError);
            return;
          }

          if (newMessage) {
            const formattedMessage = {
              ...newMessage,
              sender_nickname: (newMessage.profiles as any)?.nickname,
              sender_avatar_url: (newMessage.profiles as any)?.avatar_url,
            };
            get().addMessage(formattedMessage);
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: async () => {
    const { channel } = get();
    if (channel) {
      await supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  reset: async () => {
    const { unsubscribe } = get();
    await unsubscribe();
    set({
      activeBonfire: null,
      participants: [],
      messages: [],
      loading: false,
      sending: false,
      channel: null,
    });
  },
}));
