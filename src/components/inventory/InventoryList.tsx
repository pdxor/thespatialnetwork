import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Database } from '../../types/supabase';
import { Package, Plus, Search, Filter, Tags } from 'lucide-react';
import InventoryItemCard from './InventoryItemCard';

type InventoryItem = Database['public']['Tables']['items']['Row'];

const InventoryList: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      try {
        // Fetch items where the user is either the creator or a member of the associated project
        const { data, error } = await supabase
          .from('items')
          .select('*, projects(title), tasks(title)')
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Error fetching inventory items:', error);
          setError('Could not load inventory items');
        } else {
          setItems(data || []);
          
          // Extract all unique tags from items
          const tagsSet = new Set<string>();
          data?.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
              item.tags.forEach(tag => tagsSet.add(tag));
            }
          });
          setAllTags(Array.from(tagsSet).sort());
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [user]);

  // Filter items based on selected filters and search query
  const filteredItems = items.filter(item => {
    // Apply type filter
    if (typeFilter !== 'all' && item.item_type !== typeFilter) {
      return false;
    }
    
    // Apply tag filter
    if (tagFilter && (!item.tags || !item.tags.includes(tagFilter))) {
      return false;
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Group items by type
  const neededItems = filteredItems.filter(item => item.item_type === 'needed_supply');
  const ownedItems = filteredItems.filter(item => item.item_type === 'owned_resource');
  const borrowedItems = filteredItems.filter(item => item.item_type === 'borrowed_or_rental');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Package className="h-6 w-6 mr-2 text-green-600" />
          Inventory
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              className="pl-10 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Link
            to="/inventory/new"
            className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-1" />
            New Item
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <select
            className="pl-9 pr-8 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Item Types</option>
            <option value="needed_supply">Needed Supplies</option>
            <option value="owned_resource">Owned Resources</option>
            <option value="borrowed_or_rental">Borrowed/Rental Items</option>
          </select>
          <div className="absolute right-3 top-3 pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {allTags.length > 0 && (
          <div className="relative">
            <Tags className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select
              className="pl-9 pr-8 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <div className="absolute right-3 top-3 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No inventory items yet</h2>
          <p className="text-gray-500 mb-6">Start tracking your project resources by adding inventory items</p>
          <Link
            to="/inventory/new"
            className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors text-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Inventory Item
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No matching inventory items</h2>
          <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
              setTagFilter('');
            }}
            className="inline-flex items-center bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Needed Supplies Section */}
          {neededItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                Needed Supplies ({neededItems.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {neededItems.map(item => (
                  <Link key={item.id} to={`/inventory/${item.id}`}>
                    <InventoryItemCard item={item} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* Owned Resources Section */}
          {ownedItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Owned Resources ({ownedItems.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownedItems.map(item => (
                  <Link key={item.id} to={`/inventory/${item.id}`}>
                    <InventoryItemCard item={item} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* Borrowed/Rental Items Section */}
          {borrowedItems.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Borrowed/Rental Items ({borrowedItems.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {borrowedItems.map(item => (
                  <Link key={item.id} to={`/inventory/${item.id}`}>
                    <InventoryItemCard item={item} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryList;