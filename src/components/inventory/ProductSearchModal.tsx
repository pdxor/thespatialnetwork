import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, X, ShoppingCart, ExternalLink, DollarSign, Loader2, AlertCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductSearchModalProps {
  onClose: () => void;
  onSelect: (product: ProductSearchResult) => void;
  initialQuery?: string;
}

interface ProductSearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  price: number | null;
  image: string | null;
}

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({ onClose, onSelect, initialQuery = '' }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeysMissing, setApiKeysMissing] = useState(false);

  const searchProducts = async () => {
    if (!query.trim() || !user) return;
    
    setLoading(true);
    setError(null);
    setApiKeysMissing(false);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ 
          query: query.trim(),
          userId: user.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.error && (
          errorData.error.includes('No Google API key found') || 
          errorData.error.includes('No Google Custom Search Engine ID found')
        )) {
          setApiKeysMissing(true);
          throw new Error('Google API keys not configured. Please add them in settings.');
        }
        
        throw new Error(`Error: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      setResults(data.results || []);
      
      if (data.results.length === 0) {
        setError('No results found. Try a different search term.');
      }
    } catch (err) {
      console.error('Error searching products:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchProducts();
    }
  };

  // Auto-search if initial query is provided
  useEffect(() => {
    if (initialQuery) {
      searchProducts();
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-3xl mx-4 w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Find Products & Prices
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {apiKeysMissing && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded mb-4">
            <p className="font-semibold mb-1">Google API Keys Required</p>
            <p className="mb-2">To use product search, you need to add your Google API key and Custom Search Engine ID in settings.</p>
            <Link
              to="/settings/api-keys"
              className="inline-flex items-center text-sm bg-yellow-800 dark:bg-yellow-700 text-white px-3 py-1 rounded hover:bg-yellow-900 dark:hover:bg-yellow-600"
            >
              <Settings className="h-4 w-4 mr-1" />
              Add API Keys
            </Link>
          </div>
        )}
        
        <div className="mb-6">
          <div className="flex">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Search for products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              onClick={searchProducts}
              disabled={loading || !query.trim()}
              className="px-4 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-r-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Search for products to find current prices and details
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-10 w-10 text-blue-500 dark:text-blue-400 animate-spin" />
            <span className="ml-3 text-gray-600 dark:text-gray-300">Searching products...</span>
          </div>
        )}
        
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index} 
                className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => onSelect(result)}
              >
                {result.image && (
                  <div className="w-20 h-20 flex-shrink-0">
                    <img 
                      src={result.image} 
                      alt={result.title} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-gray-100">{result.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">{result.snippet}</p>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Source: {result.source}
                    </div>
                    <div className="flex items-center gap-2">
                      {result.price !== null && (
                        <div className="text-green-600 dark:text-green-400 font-medium flex items-center">
                          <DollarSign className="h-4 w-4 mr-0.5" />
                          {result.price.toFixed(2)}
                        </div>
                      )}
                      <a 
                        href={result.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && results.length === 0 && query && !error && (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No products found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try a different search term or be more specific</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSearchModal;