
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onSignup: (email: string, password: string) => void;
}

const LoginModal = ({ isOpen, onClose, onLogin, onSignup }: LoginModalProps) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isSignup) {
      if (password !== confirmPassword) {
        alert("Passwords don't match!");
        setIsLoading(false);
        return;
      }
      onSignup(email, password);
    } else {
      onLogin(email, password);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setIsSignup(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {isSignup ? "Create Account" : "Welcome Back"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSignup 
              ? "Join thousands of protected Etsy sellers" 
              : "Sign in to access your dashboard"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          {isSignup && (
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-trust-600 hover:bg-trust-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-trust-600 hover:text-trust-700 text-sm"
          >
            {isSignup 
              ? "Already have an account? Sign in" 
              : "Need an account? Sign up"
            }
          </button>
        </div>

        {isSignup && (
          <div className="text-xs text-gray-500 text-center mt-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
