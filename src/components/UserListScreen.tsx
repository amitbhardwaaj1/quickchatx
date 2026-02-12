import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/lib/chatContext';
import { LogOut, Settings, MessageCircle } from 'lucide-react';

interface ChatUser {
  id: string;
  username: string;
  is_online: boolean;
  last_seen: string | null;
  is_admin: boolean;
}

interface Props {
  onSelectUser: (username: string) => void;
  onOpenAdmin: () => void;
}

const UserListScreen = ({ onSelectUser, onOpenAdmin }: Props) => {
  const { currentUser, logout } = useChatContext();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      const { data } = await supabase
        .from('chat_users')
        .select('id, username, is_online, last_seen, is_admin')
        .neq('username', currentUser)
        .order('username');
      if (data) setUsers(data as ChatUser[]);

      // Check if current user is admin
      const { data: me } = await supabase
        .from('chat_users')
        .select('is_admin')
        .eq('username', currentUser)
        .single();
      if (me) setIsAdmin(me.is_admin);
    };
    fetchUsers();

    // Realtime updates for user statuses
    const channel = supabase
      .channel('users-status-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_users',
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">QuickChat</h2>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Admin Panel"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={logout}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No users available</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.username)}
                className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 text-left"
              >
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-sm font-bold uppercase text-primary">
                    {user.username[0]}
                  </div>
                  {user.is_online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-online" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground capitalize">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.is_online ? 'online' : 'offline'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserListScreen;
