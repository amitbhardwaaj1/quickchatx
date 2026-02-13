import { useChatContext } from '@/lib/chatContext';
import { ArrowLeft, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import PWAInstallButton from './PWAInstallButton';

interface Props {
  onBack: () => void;
}

const ChatHeader = ({ onBack }: Props) => {
  const { otherUser, otherUserOnline, otherUserLastSeen, logout } = useChatContext();

  const lastSeenText = otherUserLastSeen
    ? `last seen ${format(new Date(otherUserLastSeen), 'dd/MM/yyyy, hh:mm a')}`
    : '';

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold uppercase text-primary">
            {otherUser?.[0]}
          </div>
          {otherUserOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-online" />
          )}
        </div>
        <div>
          <h2 className="font-semibold capitalize text-foreground">{otherUser}</h2>
          <p className="text-xs text-muted-foreground">
            {otherUserOnline ? 'online' : lastSeenText}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PWAInstallButton />
        <button
          onClick={logout}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
