import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Conversation } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, MessageSquare, LogOut, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateGroupDialog } from "./create-group-dialog";

interface AppSidebarProps {
  conversations: Conversation[];
  currentUser: User | undefined;
  selectedConversationId: string | null;
  selectedConversationType: "direct" | "group" | null;
  onSelectConversation: (id: string, type: "direct" | "group") => void;
  onGroupCreated: () => void;
  isLoading: boolean;
}

export function AppSidebar({
  conversations,
  currentUser,
  selectedConversationId,
  selectedConversationType,
  onSelectConversation,
  onGroupCreated,
  isLoading,
}: AppSidebarProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);

  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length === 0) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to search users');
      }
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setLocation("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleSearchResultClick = (user: User) => {
    onSelectConversation(user.id, "direct");
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    try {
      await apiRequest("POST", "/api/groups", { name, memberIds });
      onGroupCreated();
    } catch (error) {
      throw error;
    }
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const filteredSearchResults = searchResults.filter(
    (user) => currentUser && user.id !== currentUser.id
  );

  if (!currentUser) return null;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getInitials(currentUser.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-current-username">
                {currentUser.username}
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            data-testid="button-logout"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateGroupDialog(true)}
            data-testid="button-create-group"
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => setShowSearchResults(searchQuery.length > 0)}
              className="pl-10 h-10"
              data-testid="input-search-users"
              aria-label="Search for users"
            />
          </div>

          {showSearchResults && (
            <div className="absolute top-full mt-2 w-full bg-popover border border-popover-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {filteredSearchResults.length > 0 ? (
                <div className="p-1" role="list" aria-label="Search results">
                  {filteredSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSearchResultClick(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-md hover-elevate active-elevate-2"
                      data-testid={`button-search-result-${user.username}`}
                      role="listitem"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{user.username}</span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length > 0 ? (
            <SidebarMenu>
              {conversations.map((conversation) => {
                const conversationId = conversation.type === "direct" 
                  ? conversation.otherUser?.id || ""
                  : conversation.group?.id || "";
                const conversationName = conversation.type === "direct"
                  ? conversation.otherUser?.username || ""
                  : conversation.group?.name || "";
                const isSelected = selectedConversationId === conversationId && 
                                 selectedConversationType === conversation.type;
                
                return (
                  <SidebarMenuItem key={`${conversation.type}-${conversationId}`}>
                    <SidebarMenuButton
                      onClick={() => onSelectConversation(conversationId, conversation.type)}
                      className={`w-full flex items-start gap-3 p-3 ${
                        isSelected ? "bg-sidebar-accent" : ""
                      }`}
                      data-testid={`button-conversation-${conversationName}`}
                      aria-current={isSelected ? "true" : "false"}
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        {conversation.type === "group" ? (
                          <AvatarFallback className="bg-accent text-accent-foreground font-semibold text-sm">
                            <Users className="w-5 h-5" />
                          </AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                            {getInitials(conversationName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold truncate">
                            {conversationName}
                            {conversation.type === "group" && conversation.group && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({conversation.group.memberCount})
                              </span>
                            )}
                          </span>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                                addSuffix: false,
                              })}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage ? (
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No messages yet
                          </p>
                        )}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="ml-auto flex-shrink-0" aria-label={`${conversation.unreadCount} unread messages`}>
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground">
                Search for users to start chatting
              </p>
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      
      {currentUser && (
        <CreateGroupDialog
          open={showCreateGroupDialog}
          onOpenChange={setShowCreateGroupDialog}
          onCreateGroup={handleCreateGroup}
          currentUserId={currentUser.id}
        />
      )}
    </Sidebar>
  );
}
