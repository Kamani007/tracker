import { Link, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu } from "lucide-react"
import { logout as azureLogout } from "@/lib/azureAuth"

const Navigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Define all navigation items
  const navItems = [
    { path: "/", label: "Home" },
    { path: "/morning-meetings", label: "Morning Meetings" },
    { path: "/stability", label: "Stability" },
    { path: "/upload-data", label: "Upload Data" },
    { path: "/analysis", label: "Analysis" },
    { path: "/all-data", label: "All Data" },
    { path: "/track-progress", label: "Track Progress" },
    { path: "/batch-tasks", label: "Batch Tasks" },
  ];

  // Filter out the current page from the menu
  const menuItems = navItems.filter(item => item.path !== currentPath);

  // Get page title based on current path
  const getPageTitle = () => {
    switch (currentPath) {
      case '/morning-meetings':
        return 'Morning Meetings';
      case '/stability':
        return 'Stability Dashboard';
      case '/upload-data':
        return 'Upload Data';
      case '/analysis':
        return 'Analysis';
      case '/all-data':
        return 'All Data';
      case '/track-progress':
        return 'Track Progress';
      case '/batch-tasks':
        return 'Batch Task Tracker';
      default:
        return null; // Home page - no title needed
    }
  };

  const pageTitle = getPageTitle();

  return (
    <div className="sticky top-0 z-50">
      <div className="bg-black shadow-md transition-all duration-300">
        <div className="flex h-25 items-center px-6">
        {/* Logo Section - Left */}
        <div className="flex items-center space-x-4 ml-40">
          <Link to="/">
            <img 
              src="/logo.png" 
              alt="Rayleigh Solar Tech" 
              className="h-15 w-auto object-contain cursor-pointer"
            />
          </Link>
        </div>
        
        {/* Center Section - Page Title (only show on non-home pages) */}
        {pageTitle && (
          <div className="flex-1 flex justify-center">
            <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
          </div>
        )}
        
        {/* Right Section - Explore and Profile */}
        <div className={`${pageTitle ? '' : 'ml-auto'} mr-4 flex items-center space-x-2`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground border-2 border-border">
                <Menu className="h-4 w-4 mr-2" />
                Explore
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-700 shadow-2xl z-50">
              {menuItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link to={item.path} className="cursor-pointer text-white hover:bg-gray-800 focus:bg-gray-800">
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Profile Circle with Dropdown */}
        <div className="flex items-center space-x-2 mr-40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer border-2 border-border">
                {(() => {
                  const email = localStorage.getItem('userEmail') || 'user@rayleighsolartech.com';
                  const namePart = email.split('@')[0];
                  const names = namePart.split('.');
                  const firstInitial = names[0]?.charAt(0).toUpperCase() || 'U';
                  const lastInitial = names[1]?.charAt(0).toUpperCase() || '';
                  return `${firstInitial}${lastInitial}`;
                })()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-gray-900 border-gray-700 shadow-2xl z-50">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-sm text-gray-400">Signed in as</p>
                <p className="text-sm font-medium text-white mt-1">
                  {localStorage.getItem('userEmail') || 'user@rayleighsolartech.com'}
                </p>
              </div>
              <DropdownMenuItem asChild>
                <button
                  onClick={() => azureLogout()}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                >
                  Logout
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>
      {/* Gradient overlay when scrolled */}
      <div 
        className={`h-8 bg-gradient-to-b from-black/70 via-black/40 to-transparent transition-opacity duration-300 ${
          isScrolled ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default Navigation;
