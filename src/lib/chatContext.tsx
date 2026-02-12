import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChatContextType {
  currentUser: string | null;
  otherUser: string | null;
  setOtherUser: (user: string | null) => void;
  login: (username: string, code: string) => Promise<boolean>;
  logout: () => void;
  isOnline: boolean;
  otherUserOnline: boolean;
  otherUserLastSeen: string | null;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('chat_user');
  });
  const [otherUser, setOtherUser] = useState<string | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);

  const updateOnlineStatus = useCallback(async (username: string, online: boolean) => {
    await supabase
      .from('chat_users')
      .update({ is_online: online, last_seen: new Date().toISOString() })
      .eq('username', username);
  }, []);

  const login = async (username: string, code: string): Promise<boolean> => {
    const { data } = await supabase
      .from('chat_users')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('secret_code', code)
      .single();

    if (data) {
      setCurrentUser(data.username);
      localStorage.setItem('chat_user', data.username);
      await updateOnlineStatus(data.username, true);
      return true;
    }
    return false;
  };

  const logout = async () => {
    if (currentUser) {
      await updateOnlineStatus(currentUser, false);
    }
    setCurrentUser(null);
    setOtherUser(null);
    localStorage.removeItem('chat_user');
  };

  // Set online on mount, offline on unmount
  useEffect(() => {
    if (!currentUser) return;
    updateOnlineStatus(currentUser, true);

    const handleBeforeUnload = () => {
      navigator.sendBeacon && updateOnlineStatus(currentUser, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const heartbeat = setInterval(() => {
      updateOnlineStatus(currentUser, true);
    }, 30000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeat);
      updateOnlineStatus(currentUser, false);
    };
  }, [currentUser, updateOnlineStatus]);

  // Subscribe to other user's online status
  useEffect(() => {
    if (!otherUser) return;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('chat_users')
        .select('is_online, last_seen')
        .eq('username', otherUser)
        .single();
      if (data) {
        setOtherUserOnline(data.is_online);
        setOtherUserLastSeen(data.last_seen);
      }
    };
    fetchStatus();

    const channel = supabase
      .channel('user-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_users',
        filter: `username=eq.${otherUser}`,
      }, (payload) => {
        const row = payload.new as any;
        setOtherUserOnline(row.is_online);
        setOtherUserLastSeen(row.last_seen);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUser]);

  return (
    <ChatContext.Provider value={{
      currentUser,
      otherUser,
      setOtherUser,
      login,
      logout,
      isOnline: true,
      otherUserOnline,
      otherUserLastSeen,
    }}>
      {children}
    </ChatContext.Provider>
  );
};
