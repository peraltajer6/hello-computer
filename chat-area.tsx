import { useEffect, useRef, useState } from "react";
import { User, MessageWithUsers, GroupWithMembers } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatAreaProps {
  currentUser: User;
  otherUser?: User;
  selectedGroup?: GroupWithMembers;
  messages: MessageWithUsers[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  isSending: boolean;
}

export default function ChatArea({
  currentUser,
  otherUser,
  selectedGroup,
  messages,
  isLoading,
  onSendMessage,
  isSending,
}: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || isSending) return;

    onSendMessage(messageInput.trim());
    setMessageInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const displayName = selectedGroup ? selectedGroup.name : otherUser?.username || "";
  const isGroup = !!selectedGroup;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Avatar className="w-10 h-10">
          {isGroup ? (
            <AvatarFallback className="bg-accent text-accent-foreground font-semibold">
              <Users className="w-5 h-5" />
            </AvatarFallback>
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(displayName)}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-chat-username">
            {displayName}
          </h2>
          {isGroup && selectedGroup && (
            <p className="text-xs text-muted-foreground">
              {selectedGroup.memberCount} members
            </p>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading messages...</div>
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="flex flex-col-reverse space-y-3 space-y-reverse" role="list" aria-label="Messages">
            <div ref={messagesEndRef} />
            {[...messages].reverse().map((message) => {
              const isSent = message.senderId === currentUser.id;
              const senderName = isSent ? currentUser.username : (message.sender?.username || "Unknown");
              return (
                <div
                  key={message.id}
                  className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.id}`}
                  role="listitem"
                  aria-label={`Message from ${isSent ? "you" : senderName}`}
                >
                  <div className={`flex gap-2 max-w-md ${isSent ? "flex-row-reverse" : "flex-row"}`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={`text-xs font-semibold ${
                        isSent 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {getInitials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isSent ? "items-end" : "items-start"}`}>
                      {isGroup && !isSent && (
                        <span className="text-xs text-muted-foreground mb-1 ml-1">
                          {senderName}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 break-words ${
                          isSent
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        <p className="text-base whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-12 text-base"
            disabled={isSending}
            data-testid="input-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageInput.trim() || isSending}
            className="h-12 w-12 rounded-full flex-shrink-0"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
