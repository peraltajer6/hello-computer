import { MessageSquare } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
        <p className="text-muted-foreground">
          Choose a conversation from the sidebar or search for a user to start chatting
        </p>
      </div>
    </div>
  );
}
