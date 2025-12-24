import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

const Signup = ({ onSignupSuccess, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate email domain
    if (!formData.email.endsWith('@rayleighsolartech.com')) {
      setError('Only @rayleighsolartech.com email addresses are allowed');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@rayleighsolartech\.com$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate name
    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Get existing users from localStorage
    const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');

    // Check if email already exists
    if (existingUsers[formData.email]) {
      setError('An account with this email already exists');
      return;
    }

    // Save new user
    existingUsers[formData.email] = {
      name: formData.name,
      password: formData.password,
      email: formData.email,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));

    // Show success message
    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onSignupSuccess();
  };

  return (
    <>
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

        {/* Signup Form */}
        <div className="flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-foreground">
                Create Account
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Join Rayleigh Solar Tech Daily Passdown System
              </CardDescription>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Company Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@rayleighsolartech.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Only @rayleighsolartech.com emails are accepted
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Already have an account?
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={onBackToLogin}
                className="w-full mt-4"
              >
                Back to Login
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                🏢 Restricted to @rayleighsolartech.com employees
              </p>
            </div>
          </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600">
              ✅ Account Created Successfully!
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>Welcome to Rayleigh Solar Tech Daily Passdown System!</p>
                <p>Your account has been created with:</p>
                <div className="bg-gray-50 p-3 rounded-md mt-2">
                  <p className="font-semibold">{formData.name}</p>
                  <p className="text-sm text-gray-600">{formData.email}</p>
                </div>
                <p className="mt-3">You can now log in with your credentials.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleSuccessClose}>
              Go to Login
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Signup;