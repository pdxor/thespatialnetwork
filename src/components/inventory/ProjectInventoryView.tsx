import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Database } from '../../types/supabase';
import { Package, Plus, Filter, ArrowLeft, Folder, Tags, DollarSign } from 'lucide-react';
import InventoryItemCard from './InventoryItemCard';
import BudgetTracker from './BudgetTracker';

type InventoryItem = Database['public']['Tables']['items']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

const ProjectInventoryView: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'budget'>('inventory');

  useEffect(() => {
    if (!projectId || !user) return;

    const fetchProjectAndItems = async () => {
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (projectError) throw projectError;
        
        if (!projectData) {
          setError('Project not found');
          return;
        }
        
        setProject(projectData);
        
        // Fetch inventory items for this project
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false });
          
        if (itemsError) throw itemsError;
        
        setItems(itemsData || []);
        
        // Extract all unique tags from items
        const tagsSet = new Set<string>();
        itemsData?.forEach(item => {
          if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => tagsSet.add(tag));
          }
        });
        setAllTags(Array.from(tagsSet).sort());
        
      } catch (err) {
        console.error('Error fetching project inventory:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading project inventory');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndItems();
  }, [projectId, user]);

  // Filter items based on selected filters
  const filteredItems = items.filter(item => {
    // Apply type filter
    if (typeFilter !== 'all' && item.item_type !== typeFilter) {
      return false;
    }
    
    // Apply tag filter
    if (tagFilter && (!item.tags || !item.tags.includes(tagFilter))) {
      return false;
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-green-400"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error || 'Project not found'}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/projects')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Return to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          to={`/projects/${projectId}`}
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Project
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Folder className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
            {project.title}
          </h1>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-4 px-6 font-medium text-sm flex items-center ${
              activeTab === 'inventory'
                ? 'border-b-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Package className="h-4 w-4 mr-1" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`py-4 px-6 font-medium text-sm flex items-center ${
              activeTab === 'budget'
                ? 'border-b-2 border-green-500 dark:border-green-400 text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Budget
          </button>
        </nav>
      </div>
      
      {activeTab === 'inventory' && (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            {allTags.length > 0 && (
              <div className="relative">
                <Tags className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <select
                  className="pl-9 pr-8 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
            
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <select
                className="pl-9 pr-8 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Item Types</option>
                <option value="needed_supply">Needed Supplies</option>
                <option value="owned_resource">Owned Resources</option>
                <option value="borrowed_or_rental">Borrowed/Rental Items</option>
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <Link
              to={`/inventory/new?project_id=${projectId}`}
              className="flex items-center justify-center bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              <Plus className="h-5 w-5 mr-1" />
              Add Item
            </Link>
          </div>
          
          {items.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No inventory items for this project yet</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Start tracking your project resources by adding inventory items</p>
              <Link
                to={`/inventory/new?project_id=${projectId}`}
                className="inline-flex items-center bg-green-600 dark:bg-green-700 text-white px-6 py-3 rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Inventory Item
              </Link>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No items match the selected filters</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Try selecting a different filter</p>
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setTagFilter('');
                }}
                className="inline-flex items-center bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Show All Items
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Needed Supplies Section */}
              {neededItems.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
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
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
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
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
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
        </>
      )}
      
      {activeTab === 'budget' && (
        <BudgetTracker projectId={projectId} />
      )}
    </div>
  );
};

export default ProjectInventoryView;