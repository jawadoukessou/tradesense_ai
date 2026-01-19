import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChatMessageProps {
  message: ChatMessageType;
  onDelete: (id: string) => void;
}

const ChatMessage = ({ message, onDelete }: ChatMessageProps) => {
  const { user } = useAuth();
  const isOwn = user?.id === message.user_id;

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'TR';
  };

  return (
    <div className={`flex gap-3 p-3 rounded-lg ${isOwn ? 'bg-primary/10' : 'bg-muted/50'}`}>
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className={isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
          {getInitials(message.user_name, message.user_email)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">
            {message.user_name || 'Trader'}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
          </span>
        </div>
        <p className="text-sm break-words">{message.message}</p>
      </div>

      {isOwn && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={() => onDelete(message.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ChatMessage;
