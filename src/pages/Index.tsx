import { useChatContext } from '@/lib/chatContext';
import LoginScreen from '@/components/LoginScreen';
import ChatWindow from '@/components/ChatWindow';

const Index = () => {
  const { currentUser } = useChatContext();
  return currentUser ? <ChatWindow /> : <LoginScreen />;
};

export default Index;
