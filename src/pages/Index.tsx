import { useState } from 'react';
import { useChatContext } from '@/lib/chatContext';
import LoginScreen from '@/components/LoginScreen';
import ChatWindow from '@/components/ChatWindow';
import UserListScreen from '@/components/UserListScreen';
import AdminPanel from '@/components/AdminPanel';

const Index = () => {
  const { currentUser, otherUser, setOtherUser } = useChatContext();
  const [showAdmin, setShowAdmin] = useState(false);

  if (!currentUser) return <LoginScreen />;

  if (showAdmin) return <AdminPanel onBack={() => setShowAdmin(false)} />;

  if (!otherUser) {
    return (
      <UserListScreen
        onSelectUser={setOtherUser}
        onOpenAdmin={() => setShowAdmin(true)}
      />
    );
  }

  return <ChatWindow onBack={() => setOtherUser(null)} />;
};

export default Index;
