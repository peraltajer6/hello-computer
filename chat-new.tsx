import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User, Conversation, MessageWithUsers } from "@shared/schema";
import { AppSidebar } from "@/components/app-sidebar";
import ChatArea from "@/components/chat-area";
import EmptyState from "@/components/empty-state";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Chat() {
  const [, setLocation] = useLocation();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversationType, setSelectedConversationType] = useState<"direct" | "group" | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: currentUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!currentUser,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithUsers[]>({
    queryKey: ["/api/messages", selectedConversationId, selectedConversationType],
    queryFn: async () => {
      if (!selectedConversationId || !selectedConversationType) return [];
      const param = selectedConversationType === "direct" 
        ? `userId=${selectedConversationId}` 
        : `groupId=${selectedConversationId}`;
      const res = await fetch(`/api/messages?${param}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch messages');
      }
      return res.json();
    },
    enabled: !!selectedConversationId && !!selectedConversationType && !!currentUser,
  });

  // Fetch selected user if not in conversations list (new conversation)
  const { data: selectedUserData } = useQuery<User>({
    queryKey: ["/api/users", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) throw new Error('No user ID');
      const res = await fetch(`/api/users/${selectedConversationId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch user');
      }
      return res.json();
    },
    enabled: !!selectedConversationId && 
             selectedConversationType === "direct" && 
             !conversations.find(c => c.type === "direct" && c.otherUser?.id === selectedConversationId),
  });

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
      
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      if (selectedConversationId) {
        // Refresh messages if this message is part of the current conversation
        if (selectedConversationType === "direct" && 
            (message.senderId === selectedConversationId || message.recipientId === selectedConversationId)) {
          queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversationId, "direct"] });
        } else if (selectedConversationType === "group" && message.groupId === selectedConversationId) {
          queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversationId, "group"] });
        }
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
  }, [currentUser, selectedConversationId, selectedConversationType]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientId?: string; groupId?: string; content: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversationId, selectedConversationType] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

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

  // Get current conversation data
  const selectedConversation = conversations.find(c => {
    if (c.type === "direct" && selectedConversationType === "direct") {
      return c.otherUser?.id === selectedConversationId;
    } else if (c.type === "group" && selectedConversationType === "group") {
      return c.group?.id === selectedConversationId;
    }
    return false;
  });

  const selectedUser = selectedConversation?.type === "direct" 
    ? selectedConversation.otherUser 
    : selectedUserData;
  const selectedGroup = selectedConversation?.type === "group" 
    ? selectedConversation.group 
    : undefined;

  const sidebarStyle = {
    "--sidebar-width": "20rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          conversations={conversations}
          currentUser={currentUser}
          selectedConversationId={selectedConversationId}
          selectedConversationType={selectedConversationType}
          onSelectConversation={(id, type) => {
            setSelectedConversationId(id);
            setSelectedConversationType(type);
          }}
          onGroupCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          }}
          isLoading={conversationsLoading}
        />
        
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b border-border bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          
          <main className="flex-1 overflow-hidden">
            {(selectedUser || selectedGroup) ? (
              <ChatArea
                currentUser={currentUser}
                otherUser={selectedUser}
                selectedGroup={selectedGroup}
                messages={messages}
                isLoading={messagesLoading}
                onSendMessage={(content) => {
                  if (!selectedConversationId || !selectedConversationType) return;
                  const messageData = selectedConversationType === "direct"
                    ? { recipientId: selectedConversationId, content }
                    : { groupId: selectedConversationId, content };
                  sendMessageMutation.mutate(messageData);
                }}
                isSending={sendMessageMutation.isPending}
              />
            ) : (
              <EmptyState />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
