import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Conversation } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentUser: User;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  isLoading: boolean;
}

export default function ConversationSidebar({
  conversations,
  currentUser,
  selectedUserId,
  onSelectUser,
  isLoading,
}: ConversationSidebarProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Search users
  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
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
    onSelectUser(user.id);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const filteredSearchResults = searchResults.filter(
    (user) => user.id !== currentUser.id
  );

  return (
    <div className="w-80 flex flex-col bg-card border-r border-card-border">
      {/* Header */}
      <div className="p-4 border-b border-card-border space-y-4">
        <div className="flex items-center justify-between">
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

        {/* Search */}
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
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full mt-2 w-full bg-popover border border-popover-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {filteredSearchResults.length > 0 ? (
                <div className="p-1">
                  {filteredSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSearchResultClick(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-md hover-elevate active-elevate-2"
                      data-testid={`button-search-result-${user.username}`}
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
      </div>

      {/* Conversations List */}
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
          <div className="p-2">
            {conversations.map((conversation) => {
              const isSelected = selectedUserId === conversation.otherUser.id;
              return (
                <button
                  key={conversation.otherUser.id}
                  onClick={() => onSelectUser(conversation.otherUser.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg hover-elevate active-elevate-2 transition-colors ${
                    isSelected ? "bg-accent" : ""
                  }`}
                  data-testid={`button-conversation-${conversation.otherUser.username}`}
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                      {getInitials(conversation.otherUser.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">
                        {conversation.otherUser.username}
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
                    <Badge variant="default" className="ml-auto flex-shrink-0">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
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
    </div>
  );
}
