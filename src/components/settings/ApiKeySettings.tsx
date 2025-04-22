import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { Key, Eye, EyeOff, Save, Info, AlertCircle, Search, Globe } from 'lucide-react';

type ApiKey = Database['public']['Tables']['api_keys']['Row'];

const ApiKeySettings: React.FC = () => {
  const { user } = useAuth();
  const [openAiKey, setOpenAiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleCseId, setGoogleCseId] = useState('');
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);
  const [showGoogleCseId, setShowGoogleCseId] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openAiKeyExists, setOpenAiKeyExists] = useState(false);
  const [googleApiKeyExists, setGoogleApiKeyExists] = useState(false);
  const [googleCseIdExists, setGoogleCseIdExists] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchApiKeys = async () => {
      try {
        // Fetch OpenAI API key
        const { data: openAiData, error: openAiError } = await supabase
          .from('api_keys')
          .select('key')
          .eq('user_id', user.id)
          .eq('service', 'openai')
          .single();
        
        if (!openAiError && openAiData) {
          setOpenAiKey(openAiData.key);
          setOpenAiKeyExists(true);
        }

        // Fetch Google API key
        const { data: googleData, error: googleError } = await supabase
          .from('api_keys')
          .select('key')
          .eq('user_id', user.id)
          .eq('service', 'google')
          .single();
        
        if (!googleError && googleData) {
          setGoogleApiKey(googleData.key);
          setGoogleApiKeyExists(true);
        }

        // Fetch Google CSE ID
        const { data: cseData, error: cseError } = await supabase
          .from('api_keys')
          .select('key')
          .eq('user_id', user.id)
          .eq('service', 'google_cse')
          .single();
        
        if (!cseError && cseData) {
          setGoogleCseId(cseData.key);
          setGoogleCseIdExists(true);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred while fetching API keys');
      } finally {
        setLoading(false);
      }
    };
    
    fetchApiKeys();
  }, [user]);
  
  const handleToggleShowOpenAiKey = () => {
    setShowOpenAiKey(!showOpenAiKey);
  };

  const handleToggleShowGoogleApiKey = () => {
    setShowGoogleApiKey(!showGoogleApiKey);
  };

  const handleToggleShowGoogleCseId = () => {
    setShowGoogleCseId(!showGoogleCseId);
  };
  
  const saveApiKey = async (service: string, key: string, exists: boolean) => {
    if (!user || !key.trim()) return false;
    
    try {
      // Delete any existing keys first to maintain uniqueness
      if (exists) {
        const { error: deleteError } = await supabase
          .from('api_keys')
          .delete()
          .eq('user_id', user.id)
          .eq('service', service);
          
        if (deleteError) {
          throw deleteError;
        }
      }

      // Insert new key
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          service: service,
          key: key.trim()
        });
        
      if (insertError) {
        throw insertError;
      }
      
      return true;
    } catch (error) {
      console.error(`Error saving ${service} API key:`, error);
      throw error;
    }
  };

  const handleSaveKeys = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const results = [];
      
      // Save OpenAI API key if provided
      if (openAiKey.trim()) {
        results.push(await saveApiKey('openai', openAiKey, openAiKeyExists));
        setOpenAiKeyExists(true);
      }
      
      // Save Google API key if provided
      if (googleApiKey.trim()) {
        results.push(await saveApiKey('google', googleApiKey, googleApiKeyExists));
        setGoogleApiKeyExists(true);
      }
      
      // Save Google CSE ID if provided
      if (googleCseId.trim()) {
        results.push(await saveApiKey('google_cse', googleCseId, googleCseIdExists));
        setGoogleCseIdExists(true);
      }
      
      if (results.length > 0 && results.every(result => result)) {
        setSuccess('API keys saved successfully');
      } else if (results.length === 0) {
        setError('No API keys provided');
      }
    } catch (err) {
      console.error('Error saving API keys:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save API keys');
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper function to ensure string values
  const validateOpenAiKey = (key: string) => {
    if (!key.trim()) return false;
    // Basic validation for OpenAI API key format (starts with "sk-" and is at least 32 chars)
    return key.startsWith('sk-') && key.length >= 32;
  };

  // Helper function to validate Google API key (basic check)
  const validateGoogleApiKey = (key: string) => {
    if (!key.trim()) return false;
    // Basic validation for Google API key format (typically starts with "AIza" and is at least 32 chars)
    return key.startsWith('AIza') && key.length >= 32;
  };

  // Helper function to validate Google CSE ID (basic check)
  const validateGoogleCseId = (id: string) => {
    if (!id.trim()) return false;
    // Basic validation for Google CSE ID format (alphanumeric with colons)
    return /^[a-zA-Z0-9:]+$/.test(id) && id.length >= 10;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 dark:border-teal-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">API Key Settings</h2>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 flex items-center">
            <Key className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
            OpenAI API Key
          </h3>
          <div className="ml-auto">
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center"
            >
              <Info className="h-4 w-4 mr-1" />
              Get API Key
            </a>
          </div>
        </div>
        
        <div className="relative">
          <input
            type={showOpenAiKey ? "text" : "password"}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
            value={openAiKey}
            onChange={(e) => setOpenAiKey(e.target.value)}
            placeholder="Enter your OpenAI API key"
          />
          <button
            type="button"
            className="absolute right-2 top-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={handleToggleShowOpenAiKey}
          >
            {showOpenAiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your API key is securely stored and encrypted in our database.
        </p>
        
        {openAiKey && !validateOpenAiKey(openAiKey) && (
          <div className="mt-2 text-amber-600 dark:text-amber-400 flex items-center text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            This doesn't look like a valid OpenAI API key. Keys should start with 'sk-'.
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Google API Key
          </h3>
          <div className="ml-auto">
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
            >
              <Info className="h-4 w-4 mr-1" />
              Get API Key
            </a>
          </div>
        </div>
        
        <div className="relative">
          <input
            type={showGoogleApiKey ? "text" : "password"}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"
            value={googleApiKey}
            onChange={(e) => setGoogleApiKey(e.target.value)}
            placeholder="Enter your Google API key"
          />
          <button
            type="button"
            className="absolute right-2 top-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={handleToggleShowGoogleApiKey}
          >
            {showGoogleApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Required for product search functionality. Enable the Custom Search API in your Google Cloud Console.
        </p>
        
        {googleApiKey && !validateGoogleApiKey(googleApiKey) && (
          <div className="mt-2 text-amber-600 dark:text-amber-400 flex items-center text-sm">
            <AlertCircle className="h-4 w-4 mr-1" />
            This doesn't look like a valid Google API key. Keys typically start with 'AIza'.
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center mb-2">
          <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Google Custom Search Engine ID
          </h3>
          <div className="ml-auto">
            <a 
              href="https://programmablesearchengine.google.com/cse/all" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
            >
              <Info className="h-4 w-4 mr-1" />
              Create CSE
            </a>
          </div>
        </div>
        
        <div className="relative">
          <input
            type={showGoogleCseId ? "text" : "password"}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"
            value={googleCseId}
            onChange={(e) => setGoogleCseId(e.target.value)}
            placeholder="Enter your Google Custom Search Engine ID"
          />
          <button
            type="button"
            className="absolute right-2 top-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={handleToggleShowGoogleCseId}
          >
            {showGoogleCseId ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create a Programmable Search Engine and enable "Search the entire web" option.
        </p>
      </div>
      
      <button
        onClick={handleSaveKeys}
        disabled={saving || (openAiKey && !validateOpenAiKey(openAiKey)) || (googleApiKey && !validateGoogleApiKey(googleApiKey))}
        className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-50 flex items-center justify-center disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed"
      >
        {saving ? (
          <span className="flex items-center">
            <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white rounded-full border-2 border-white border-t-transparent"></div>
            Saving...
          </span>
        ) : (
          <span className="flex items-center">
            <Save className="h-5 w-5 mr-2" />
            Save API Keys
          </span>
        )}
      </button>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4">
          <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">OpenAI API Key</h4>
          <p className="text-purple-700 dark:text-purple-400 text-sm">
            An OpenAI API key allows you to use AI assistance in this application to help generate content for your projects.
            You're only charged for what you use, and you can set usage limits in your OpenAI account.
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Google Search API</h4>
          <p className="text-blue-700 dark:text-blue-400 text-sm">
            The Google API key and Custom Search Engine ID enable product search functionality to find prices and details for inventory items.
            This helps you make informed purchasing decisions for your projects.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettings;