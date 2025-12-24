/**
 * Azure Static Web Apps Authentication Helper
 * 
 * This file handles authentication for both local development and Azure SWA deployment
 * 
 * LOCAL DEV: Auto-authenticates (dev mode)
 * AZURE PRODUCTION: Uses Azure AD authentication
 */

// ==================== ENVIRONMENT CONFIGURATION ====================
// 🔧 DEPLOYMENT GUIDE: Comment/Uncomment the appropriate block before deployment

// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
export const isDevelopment = () => true;
export const isAzureSWA = () => false;

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
// export const isDevelopment = () => false;
// export const isAzureSWA = () => true;

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
// export const isDevelopment = () => false;
// export const isAzureSWA = () => true;

// Get user info from Azure SWA
export const getAzureUser = async () => {
  try {
    console.log('[Auth] Fetching user from /.auth/me...');
    const response = await fetch('/.auth/me');
    
    if (!response.ok) {
      console.error('[Auth] /.auth/me failed:', response.status, response.statusText);
      return null;
    }
    
    const payload = await response.json();
    console.log('[Auth] /.auth/me response:', payload);
    
    const { clientPrincipal } = payload;
    
    if (clientPrincipal) {
      const email = clientPrincipal.userDetails;
      
      // Validate email domain for security
      if (!email.endsWith('@rayleighsolartech.com')) {
        console.error('[Auth] Invalid email domain:', email);
        alert('Access denied: Only @rayleighsolartech.com emails are allowed');
        return null;
      }
      
      const user = {
        email: email,
        name: clientPrincipal.userDetails.split('@')[0],
        userId: clientPrincipal.userId,
        provider: clientPrincipal.identityProvider
      };
      
      console.log('[Auth] User authenticated:', user);
      return user;
    }
    
    console.log('[Auth] No clientPrincipal found');
    return null;
  } catch (error) {
    console.error('[Auth] Failed to get Azure user:', error);
    return null;
  }
};

// Check authentication status
export const checkAuthentication = async () => {
  console.log('[Auth] Checking authentication...');
  
  // LOCAL DEVELOPMENT: Auto-authenticate for testing
  if (isDevelopment()) {
    console.log('[Auth] 🔧 Development mode - auto-authenticated');
    // Set dev user info
    // 🔧 CHANGE THIS EMAIL to test different users locally
    const testEmail = 'manish.jadhav@rayleighsolartech.com'; // Change to any user's email for testing
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', testEmail);
    localStorage.setItem('userName', testEmail.split('@')[0]);
    return true;
  }
  
  // AZURE PRODUCTION: Check Azure AD authentication
  if (isAzureSWA()) {
    console.log('[Auth] Azure environment detected, checking /.auth/me');
    const user = await getAzureUser();
    if (user) {
      // Store user info in localStorage for consistency
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userName', user.name);
      console.log('[Auth] User authenticated on Azure');
      return true;
    }
    console.log('[Auth] No authenticated user on Azure');
    return false;
  }
  
  // Fallback (should not reach here)
  console.warn('[Auth] Unknown environment, denying access');
  return false;
};

// Login function
export const login = () => {
  // Development mode - already auto-authenticated
  if (isDevelopment()) {
    console.log('[Auth] 🔧 Dev mode - already authenticated');
    return;
  }
  
  // Azure production - redirect to Azure AD
  if (isAzureSWA()) {
    console.log('[Auth] Redirecting to Azure AD login...');
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=' + window.location.origin;
  }
};

// Logout function
export const logout = () => {
  console.log('[Auth] Logging out...');
  
  // Clear localStorage
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('registeredUsers');
  
  // Development mode - just reload
  if (isDevelopment()) {
    console.log('[Auth] 🔧 Dev mode logout - reloading');
    window.location.reload();
    return;
  }
  
  // Azure production - redirect to Azure logout
  if (isAzureSWA()) {
    console.log('[Auth] Redirecting to Azure logout...');
    window.location.href = '/.auth/logout?post_logout_redirect_uri=' + window.location.origin;
  }
};

// Get current user info
export const getCurrentUser = () => {
  return {
    email: localStorage.getItem('userEmail'),
    name: localStorage.getItem('userName'),
    isAuthenticated: localStorage.getItem('isAuthenticated') === 'true'
  };
};
