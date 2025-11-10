import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageSquare } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isSignup, setIsSignup] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (isSignup && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    
    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username.trim(),
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `Failed to ${isSignup ? 'signup' : 'login'}`);
        return;
      }

      setLocation("/chat");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            {isSignup ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-base">
            {isSignup ? "Sign up to start messaging" : "Login to continue chatting"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 text-base"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder={isSignup ? "Create a password (min 6 characters)" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base"
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div 
                className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg"
                data-testid="text-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="button-submit"
              className="w-full h-12 text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? (isSignup ? "Creating account..." : "Logging in...") : (isSignup ? "Sign Up" : "Login")}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isSignup ? "Already have an account?" : "Don't have an account?"}
              </span>
              {" "}
              <Button
                type="button"
                variant="link"
                data-testid="button-toggle-mode"
                className="p-0 h-auto text-sm font-medium"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError("");
                }}
                disabled={isLoading}
              >
                {isSignup ? "Login" : "Sign Up"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
