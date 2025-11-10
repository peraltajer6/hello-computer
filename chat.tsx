import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User, Conversation, MessageWithUsers } from "@shared/schema";
import ConversationSidebar from "@/components/conversation-sidebar";
import ChatArea from "@/components/chat-area";
import EmptyState from "@/components/empty-state";

export default function Chat() {
  const [, setLocation] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch current user
  const { data: currentUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!currentUser,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithUsers[]>({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId && !!currentUser,
  });

  // WebSocket setup for real-time messages
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as MessageWithUsers;
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // If message is for current conversation, invalidate messages
      if (
        selectedUserId &&
        (message.senderId === selectedUserId || message.recipientId === selectedUserId)
      ) {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    wsRef.current = socket;

    return () => {
      socket.close();
    };
  }, [currentUser, selectedUserId]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientId: string; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !currentUser) {
      setLocation("/");
    }
  }, [currentUser, userLoading, setLocation]);

  if (userLoading || !currentUser) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const selectedUser = conversations.find(c => c.otherUser.id === selectedUserId)?.otherUser;

  return (
    <div className="h-screen flex bg-background">
      <ConversationSidebar
        conversations={conversations}
        currentUser={currentUser}
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        isLoading={conversationsLoading}
      />
      
      <div className="flex-1 flex flex-col border-l border-border">
        {selectedUserId && selectedUser ? (
          <ChatArea
            currentUser={currentUser}
            otherUser={selectedUser}
            messages={messages}
            isLoading={messagesLoading}
            onSendMessage={(content) => {
              sendMessageMutation.mutate({
                recipientId: selectedUserId,
                content,
              });
            }}
            isSending={sendMessageMutation.isPending}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
