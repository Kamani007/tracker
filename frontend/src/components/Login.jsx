import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';

const Login = ({ onLogin, onSignupClick }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validate email domain
    if (!credentials.email.endsWith('@rayleighsolartech.com')) {
      setError('Only @rayleighsolartech.com email addresses are allowed');
      return;
    }

    // Get registered users from localStorage
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    
    // Check if user exists and password matches
    const user = registeredUsers[credentials.email];
    
    if (user && user.password === credentials.password) {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', credentials.email);
      localStorage.setItem('userName', user.name);
      onLogin(true);
    } else {
      setError('Invalid email or password');
    }
  };

  const handleMicrosoftLogin = () => {
    // For Azure Static Web Apps with Microsoft authentication
    window.location.href = '/.auth/login/aad';
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    
    if (!forgotEmail.endsWith('@rayleighsolartech.com')) {
      setResetMessage('Please enter a valid @rayleighsolartech.com email');
      return;
    }

    // In production, this would trigger a password reset email
    setResetMessage('Password reset instructions have been sent to your email');
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      setShowForgotPassword(false);
      setResetMessage('');
      setForgotEmail('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header with Logo */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <img 
            src="/logo.png" 
            alt="Rayleigh Solar Tech" 
            className="h-10 w-auto object-contain"
          />
        </div>
      </header>

      {/* Login Form */}
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-foreground">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Use your Microsoft account to access the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email/Password Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@rayleighsolartech.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(!showForgotPassword)}
                className="text-sm text-primary hover:underline"
              >
                Forgot your password?
              </button>
            </div>

            {/* Forgot Password Form */}
            {showForgotPassword && (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                <h3 className="font-semibold text-sm text-foreground">Reset Password</h3>
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="your.email@rayleighsolartech.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="bg-background border-input text-foreground"
                  />
                  <Button type="submit" className="w-full" size="sm">
                    Send Reset Link
                  </Button>
                </form>
                {resetMessage && (
                  <p className="text-xs text-center text-muted-foreground">
                    {resetMessage}
                  </p>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or sign in with
                </span>
              </div>
            </div>

            {/* Microsoft Sign In Button */}
            <Button
              onClick={handleMicrosoftLogin}
              variant="outline"
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623"/>
              </svg>
              Microsoft Account
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  New Employee?
                </span>
              </div>
            </div>

            {/* Signup Button */}
            <Button
              variant="outline"
              onClick={onSignupClick}
              className="w-full"
            >
              Create Account
            </Button>

            {/* Info */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                🏢 Restricted to @rayleighsolartech.com employees
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;