import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatContext } from '@/lib/chatContext';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatUser {
  id: string;
  username: string;
  secret_code: string;
  is_online: boolean;
  is_admin: boolean;
  created_at: string;
}

interface Props {
  onBack: () => void;
}

const AdminPanel = ({ onBack }: Props) => {
  const { currentUser } = useChatContext();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newCode, setNewCode] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ChatUser | null>(null);

  const fetchUsers = async () => {
    const { data } = await supabase.from('chat_users').select('*').order('created_at');
    if (data) setUsers(data as ChatUser[]);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newUsername.trim() || !newCode.trim()) {
      setError('Both fields are required');
      return;
    }

    const { error: insertError } = await supabase.from('chat_users').insert({
      username: newUsername.toLowerCase().trim(),
      secret_code: newCode.trim(),
    });

    if (insertError) {
      setError(insertError.message.includes('duplicate') ? 'Username already exists' : insertError.message);
    } else {
      setNewUsername('');
      setNewCode('');
      fetchUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    await supabase.from('messages').delete().or(`sender.eq.${deleteTarget.username},receiver.eq.${deleteTarget.username}`);
    await supabase.from('chat_users').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchUsers();
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Users className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-foreground">Admin Panel</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Add user form */}
        <div className="rounded-xl bg-card p-4 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Add New User
          </h3>
          <form onSubmit={handleAddUser} className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Secret Code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110">
              Add User
            </button>
          </form>
        </div>

        {/* User list */}
        <div className="rounded-xl bg-card p-4 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">All Users ({users.length})</h3>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5 border border-border">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold uppercase text-primary">
                      {user.username[0]}
                    </div>
                    {user.is_online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-online" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {user.username}
                      {user.is_admin && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Admin</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">Code: {user.secret_code}</p>
                  </div>
                </div>
                {user.username !== currentUser && !user.is_admin && (
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete user "{deleteTarget?.username}"?</AlertDialogTitle>
            <AlertDialogDescription>This will also delete all their messages. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPanel;
