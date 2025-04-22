import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Leaf, User, LogOut, Settings, CheckSquare, Package, Menu, X, Mic, Bell, Calendar, Award } from 'lucide-react';
import UniversalVoiceInput from '../common/UniversalVoiceInput';
import ThemeToggle from '../common/ThemeToggle';
import FloatingMicButton from '../common/FloatingMicButton';

const Layout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [currentProject, setCurrentProject] = useState<{ id: string; title: string } | null>(null);
  const [notifications, setNotifications] = useState<number>(0);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  // Add effect to detect project context from URL
  useEffect(() => {
    const checkProjectContext = async () => {
      const projectMatch = location.pathname.match(/\/projects\/([^\/]+)/);
      if (projectMatch && projectMatch[1]) {
        // Skip fetching if the path is /projects/new
        if (projectMatch[1] === 'new') {
          setCurrentProject(null);
          return;
        }

        // Validate UUID format using regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectMatch[1])) {
          setCurrentProject(null);
          return;
        }

        try {
          const { data: project, error } = await supabase
            .from('projects')
            .select('id, title')
            .eq('id', projectMatch[1])
            .single();
            
          if (error) throw error;
          if (project) {
            setCurrentProject(project);
          }
        } catch (err) {
          console.error('Error fetching project context:', err);
          setCurrentProject(null);
        }
      } else {
        setCurrentProject(null);
      }
    };

    checkProjectContext();
  }, [location.pathname]);

  // Fetch user avatar
  useEffect(() => {
    if (user) {
      const fetchUserAvatar = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('user_id', user.id)
            .single();
            
          if (!error && data && data.avatar_url) {
            setUserAvatar(data.avatar_url);
          }
        } catch (err) {
          console.error('Error fetching user avatar:', err);
        }
      };
      
      fetchUserAvatar();
    }
  }, [user]);

  // Handle logout
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    setLoading(true);
    try {
      await signOut();
      setShowUserMenu(false); // Close the menu
      setIsMobileMenuOpen(false); // Close mobile menu if open
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hide menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if click is outside both the menu and the button
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }

      // Handle mobile menu
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        hamburgerButtonRef.current &&
        !hamburgerButtonRef.current.contains(e.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    
    if (showUserMenu || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, isMobileMenuOpen]);

  // Close mobile menu when changing routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Demo login using Supabase Auth
  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      // Demo credentials - in a real app, you would NEVER hardcode these
      const demoEmail = 'demo@example.com';
      const demoPassword = 'demodemo';

      // First check if demo account exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', demoEmail)
        .single();

      if (userError) {
        // Demo user doesn't exist yet, create one
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Create a profile for the demo user
          await supabase.from('profiles').insert({
            user_id: authData.user.id,
            name: 'Demo User',
            email: demoEmail,
            skills: ['Permaculture', 'Gardening', 'Sustainable Design'],
            joined_at: new Date().toISOString(),
          });
        }
      } else {
        // Demo user exists, just sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });
        
        if (error) throw error;
      }

      // Navigate to projects after successful login
      navigate('/projects');
    } catch (error) {
      console.error('Demo login error:', error);
      alert('Could not log in with demo account. Please try again or use regular login.');
    } finally {
      setDemoLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
      <header className="bg-gradient-to-r from-green-700 to-green-600 dark:from-teal-900 dark:to-cyan-900 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold flex items-center">
            <Leaf className="h-7 w-7 mr-2 text-white dark:text-cyan-400" />
            <span className="hidden sm:inline">The Spatial Network</span>
            <span className="sm:hidden">Spatial</span>
          </Link>
          
          {/* Mobile Menu Button */}
          <button 
            ref={hamburgerButtonRef}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {!user ? (
              <>
                <button 
                  onClick={handleDemoLogin}
                  disabled={demoLoading}
                  className="bg-white dark:bg-gray-800 text-green-700 dark:text-cyan-400 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-70 flex items-center transition-all duration-200 shadow-sm"
                >
                  {demoLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 border-2 border-green-700 dark:border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      Logging in...
                    </>
                  ) : (
                    'Demo: Login'
                  )}
                </button>
                <Link
                  to="/login"
                  className="text-white hover:text-green-200 dark:hover:text-cyan-300 px-3 py-2 rounded-lg hover:bg-green-600 dark:hover:bg-teal-800 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-white bg-green-600 dark:bg-teal-800 hover:bg-green-500 dark:hover:bg-teal-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Register
                </Link>
                <ThemeToggle />
              </>
            ) : (
              <>
                <Link
                  to="/projects"
                  className={`px-3 py-2 rounded-lg transition-colors ${location.pathname.startsWith('/projects') ? 'bg-green-600 dark:bg-teal-800 text-white' : 'hover:bg-green-600 dark:hover:bg-teal-800 text-white'}`}
                >
                  Projects
                </Link>
                <Link
                  to="/tasks"
                  className={`px-3 py-2 rounded-lg flex items-center transition-colors ${location.pathname.startsWith('/tasks') ? 'bg-green-600 dark:bg-teal-800 text-white' : 'hover:bg-green-600 dark:hover:bg-teal-800 text-white'}`}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Tasks
                </Link>
                <Link
                  to="/calendar"
                  className={`px-3 py-2 rounded-lg flex items-center transition-colors ${location.pathname.startsWith('/calendar') ? 'bg-green-600 dark:bg-teal-800 text-white' : 'hover:bg-green-600 dark:hover:bg-teal-800 text-white'}`}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendar
                </Link>
                <Link
                  to="/inventory"
                  className={`px-3 py-2 rounded-lg flex items-center transition-colors ${location.pathname.startsWith('/inventory') ? 'bg-green-600 dark:bg-teal-800 text-white' : 'hover:bg-green-600 dark:hover:bg-teal-800 text-white'}`}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Inventory
                </Link>
                <Link
                  to="/badges"
                  className={`px-3 py-2 rounded-lg flex items-center transition-colors ${location.pathname.startsWith('/badges') || location.pathname.startsWith('/badge-quests') ? 'bg-green-600 dark:bg-teal-800 text-white' : 'hover:bg-green-600 dark:hover:bg-teal-800 text-white'}`}
                >
                  <Award className="h-4 w-4 mr-1" />
                  Badges
                </Link>
                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-lg transition-colors ${location.pathname.startsWith('/profile') ? 'bg-green-600 dark:bg-teal-800 text-white' : 'hover:bg-green-600 dark:hover:bg-teal-800 text-white'}`}
                >
                  Profile
                </Link>
                
                {/* Notification Bell */}
                <button className="p-2 rounded-full hover:bg-green-600 dark:hover:bg-teal-800 relative">
                  <Bell className="h-5 w-5 text-white" />
                  {notifications > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                      {notifications}
                    </span>
                  )}
                </button>
                
                {user && (
                  <button
                    onClick={() => setShowVoiceInput(true)}
                    className="p-2 rounded-full bg-purple-600 dark:bg-purple-800 text-white hover:bg-purple-700 dark:hover:bg-purple-700 flex items-center justify-center transition-colors shadow-sm"
                    title="Voice Input"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
                
                <ThemeToggle />
                
                <div className="relative inline-block ml-2">
                  <button 
                    ref={buttonRef}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserMenu(!showUserMenu);
                    }}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt="User avatar" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-green-200 dark:bg-teal-800 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-700 dark:text-cyan-400" />
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {showUserMenu && (
                    <div 
                      ref={menuRef}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-10 overflow-hidden"
                      onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
                    >
                      <div className="py-2">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            My Profile
                          </div>
                        </Link>
                        <Link
                          to="/user-badges"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <div className="flex items-center">
                            <Award className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            My Badges
                          </div>
                        </Link>
                        <Link
                          to="/settings/api-keys"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <div className="flex items-center">
                            <Settings className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            API Key Settings
                          </div>
                        </Link>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                        <button
                          onClick={handleLogout}
                          disabled={loading}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center">
                            <LogOut className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            {loading ? 'Logging out...' : 'Logout'}
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          {/* Mobile Menu */}
          <div 
            ref={mobileMenuRef}
            className={`fixed top-0 right-0 h-full w-72 bg-green-800 dark:bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
              isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            } lg:hidden`}
          >
            <div className="p-5">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-white text-xl font-semibold">Menu</h2>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="text-white focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {user && (
                <div className="mb-6 flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm mr-3">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt="User avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-green-200 dark:bg-teal-800 flex items-center justify-center">
                        <User className="h-6 w-6 text-green-700 dark:text-cyan-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Link 
                      to="/profile"
                      className="text-white font-medium hover:text-green-200 dark:hover:text-cyan-300 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                {!user ? (
                  <>
                    <button 
                      onClick={handleDemoLogin}
                      disabled={demoLoading}
                      className="bg-white dark:bg-gray-700 text-green-700 dark:text-cyan-400 px-4 py-3 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-70 flex items-center justify-center transition-colors shadow-sm mb-4"
                    >
                      {demoLoading ? (
                        <>
                          <div className="mr-2 h-4 w-4 border-2 border-green-700 dark:border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                          Logging in...
                        </>
                      ) : (
                        'Demo: Login'
                      )}
                    </button>
                    <Link
                      to="/login"
                      className="text-white hover:text-green-200 dark:hover:text-cyan-300 py-3 px-4 block rounded-lg hover:bg-green-700 dark:hover:bg-teal-800 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="text-white hover:text-green-200 dark:hover:text-cyan-300 py-3 px-4 block rounded-lg hover:bg-green-700 dark:hover:bg-teal-800 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Register
                    </Link>
                    <div className="flex justify-center pt-4">
                      <ThemeToggle />
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to="/projects"
                      className={`px-4 py-3 rounded-lg w-full ${location.pathname.startsWith('/projects') ? 'bg-green-600 dark:bg-teal-800' : 'hover:bg-green-700 dark:hover:bg-teal-700'} text-white transition-colors`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Projects
                    </Link>
                    <Link
                      to="/tasks"
                      className={`px-4 py-3 rounded-lg w-full flex items-center ${location.pathname.startsWith('/tasks') ? 'bg-green-600 dark:bg-teal-800' : 'hover:bg-green-700 dark:hover:bg-teal-700'} text-white transition-colors`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <CheckSquare className="h-5 w-5 mr-2" />
                      Tasks
                    </Link>
                    <Link
                      to="/calendar"
                      className={`px-4 py-3 rounded-lg w-full flex items-center ${location.pathname.startsWith('/calendar') ? 'bg-green-600 dark:bg-teal-800' : 'hover:bg-green-700 dark:hover:bg-teal-700'} text-white transition-colors`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      Calendar
                    </Link>
                    <Link
                      to="/inventory"
                      className={`px-4 py-3 rounded-lg w-full flex items-center ${location.pathname.startsWith('/inventory') ? 'bg-green-600 dark:bg-teal-800' : 'hover:bg-green-700 dark:hover:bg-teal-700'} text-white transition-colors`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Package className="h-5 w-5 mr-2" />
                      Inventory
                    </Link>
                    <Link
                      to="/badges"
                      className={`px-4 py-3 rounded-lg w-full flex items-center ${location.pathname.startsWith('/badges') || location.pathname.startsWith('/badge-quests') ? 'bg-green-600 dark:bg-teal-800' : 'hover:bg-green-700 dark:hover:bg-teal-700'} text-white transition-colors`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Award className="h-5 w-5 mr-2" />
                      Badges
                    </Link>
                    <Link
                      to="/badge-quests"
                      className={`px-4 py-3 rounded-lg w-full flex items-center ml-6 ${location.pathname.startsWith('/badge-quests') ? 'bg-green-600 dark:bg-teal-800' : 'hover:bg-green-700 dark:hover:bg-teal-700'} text-white transition-colors`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <CheckSquare className="h-5 w-5 mr-2" />
                      Badge Quests
                    </Link>
                    <Link
                      to="/settings/api-keys"
                      className={`px-4 py-3 rounded-lg w-full ${location.pathname.startsWith('/settings') ? 'bg-green-600 dark:bg-teal-800' : 'hover:bg-green-700 dark:hover:bg-teal-700'} text-white transition-colors`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5 mr-2 inline" />
                      API Settings
                    </Link>
                    
                    <div className="flex justify-center pt-4">
                      <ThemeToggle />
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-green-600 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setShowVoiceInput(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-purple-600 dark:bg-purple-800 text-white py-3 px-4 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-700 transition-colors flex items-center justify-center shadow-sm"
                      >
                        <Mic className="h-5 w-5 mr-2" />
                        Voice Input
                      </button>
                    </div>
                    
                    <div className="pt-4 mt-4 border-t border-green-600 dark:border-gray-700">
                      <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full text-left px-4 py-3 text-white hover:bg-green-700 dark:hover:bg-teal-800 rounded-lg transition-colors"
                      >
                        <div className="flex items-center">
                          <LogOut className="h-5 w-5 mr-2" />
                          {loading ? 'Logging out...' : 'Logout'}
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Overlay for mobile menu */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
          )}
        </div>
      </header>
      
      {/* Project context indicator */}
      {currentProject && (
        <div className="bg-green-50 dark:bg-gray-800 border-b border-green-200 dark:border-gray-700 py-2 px-4">
          <div className="container mx-auto flex items-center text-green-800 dark:text-cyan-400">
            <Leaf className="h-4 w-4 mr-2 text-green-600 dark:text-cyan-500" />
            <span className="text-sm font-medium">
              Current Project: 
              <Link 
                to={`/projects/${currentProject.id}`} 
                className="ml-1 text-green-700 dark:text-cyan-400 hover:text-green-900 dark:hover:text-cyan-300 hover:underline"
              >
                {currentProject.title}
              </Link>
            </span>
          </div>
        </div>
      )}
      
      <main className="container mx-auto py-8 px-4 flex-grow">
        <Outlet />
        {showVoiceInput && (
          <UniversalVoiceInput 
            onClose={() => setShowVoiceInput(false)} 
            currentProject={currentProject}
          />
        )}
      </main>
      
      {/* Floating Mic Button */}
      {user && <FloatingMicButton currentProject={currentProject} />}
      
      <footer className="bg-gray-800 dark:bg-gray-950 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <Link to="/" className="flex items-center">
                <Leaf className="h-7 w-7 mr-2 text-green-400 dark:text-cyan-500" />
                <span className="text-xl font-bold">The Spatial Network</span>
              </Link>
              <p className="text-gray-400 mt-2">Building sustainable communities together</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Documentation</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Guides</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">API</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">About</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Careers</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Connect</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Twitter</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">GitHub</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Discord</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} The Spatial Network. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;