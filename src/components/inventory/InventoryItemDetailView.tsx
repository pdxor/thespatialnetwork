import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { CheckSquare, Calendar, AlertCircle, Edit, Trash2, Folder, User, Clock, Package, Plus, Users, DollarSign, ShoppingCart, CheckCircle, Search, ExternalLink } from 'lucide-react';
import MemberList from '../common/MemberList';
import ProductSearchModal from './ProductSearchModal';

type InventoryItem = Database['public']['Tables']['items']['Row'];

interface Member {
  id: string;
  name: string;
  email: string;
}

interface ProductSearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  price: number | null;
  image: string | null;
}

const InventoryItemDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [taskName, setTaskName] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<Member[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false);
  const [purchaseOptions, setPurchaseOptions] = useState<any[]>([]);
  const [loadingPurchaseOptions, setLoadingPurchaseOptions] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchItem = async () => {
      try {
        // Fetch item
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('*')
          .eq('id', id)
          .single();
          
        if (itemError) throw itemError;
        
        if (!itemData) {
          setError('Item not found');
          return;
        }
        
        setItem(itemData);
        
        // Fetch project name if item is associated with a project
        if (itemData.project_id) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('title')
            .eq('id', itemData.project_id)
            .single();
            
          if (projectError) console.error('Error fetching project:', projectError);
          else setProjectName(projectData?.title || null);
        }
        
        // Fetch task name if item is associated with a task
        if (itemData.associated_task_id) {
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select('title')
            .eq('id', itemData.associated_task_id)
            .single();
            
          if (taskError) console.error('Error fetching task:', taskError);
          else setTaskName(taskData?.title || null);
        }
        
        // Fetch assignees if available
        if (itemData.assignees && itemData.assignees.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', itemData.assignees);
            
          if (!profilesError && profiles) {
            const memberList: Member[] = profiles.map(profile => ({
              id: profile.user_id,
              name: profile.name || 'Team Member',
              email: profile.email || ''
            }));
            setAssignees(memberList);
          }
        }
        
      } catch (err) {
        console.error('Error fetching inventory item details:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the inventory item');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchItem();
  }, [id, user]);
  
  const handleDelete = async () => {
    if (!item || !user) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);
        
      if (error) throw error;
      
      // Navigate back to inventory list or project inventory
      if (item.project_id) {
        navigate(`/projects/${item.project_id}/inventory`);
      } else {
        navigate('/inventory');
      }
      
    } catch (err) {
      console.error('Error deleting inventory item:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while deleting the inventory item');
      }
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkAsOwned = async () => {
    if (!item || !user) return;
    
    try {
      // Update item type to owned_resource
      const { error } = await supabase
        .from('items')
        .update({
          item_type: 'owned_resource',
          quantity_owned: item.quantity_needed,
          quantity_needed: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (error) throw error;
      
      // Refresh the page or update the item state
      setItem({
        ...item,
        item_type: 'owned_resource',
        quantity_owned: item.quantity_needed,
        quantity_needed: null
      });
      
    } catch (err) {
      console.error('Error updating item status:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while updating the item status');
      }
    }
  };

  const findPurchaseOptions = async () => {
    if (!item || !user) return;
    
    setLoadingPurchaseOptions(true);
    try {
      // Mock purchase options for now
      // In a real implementation, this would call an API to search for the item
      const mockOptions = [
        {
          title: `Amazon Best Sellers: Best ${item.title}s`,
          description: `Compact ${item.title} for your needs. Auto Shut Off.`,
          price: item.price ? item.price * 0.9 : 49.99,
          source: 'www.amazon.com',
          image: 'https://m.media-amazon.com/images/I/71sBGR2cJWL._AC_UL320_.jpg'
        },
        {
          title: `${item.title}s for Sale | Best Price, Best Quality ...`,
          description: `You'll put unnecessary wear on your ${item.title} if you don't use a good one, so invest in one! NICE SELECTION AVAILABLE.`,
          price: item.price ? item.price * 1.1 : 59.99,
          source: 'spencertiled.com',
          image: 'https://m.media-amazon.com/images/I/61uPbPy-IFL._AC_UL320_.jpg'
        },
        {
          title: `${item.title}s for sale - eBay`,
          description: `Find vintage and modern ${item.title}s like the Zenith ZEN902 and Kinyo AutoWinder. Enhance your experience. Shop on eBay today!`,
          price: item.price ? item.price * 0.8 : 39.99,
          source: 'www.ebay.com',
          image: 'https://i.ebayimg.com/thumbs/images/g/1UwAAOSwQF1kKnLB/s-l225.webp'
        },
        {
          title: `Be kind, rewind! Or you get a dollar charge, and that gave birth to ...`,
          description: `Mar 24, 2023 ... In the 80's and 90's a ${item.title} wasn't cheap and even today they cost $100 or more so having a separate one for $15.00 was a good investment.`,
          price: 15.00,
          source: 'www.reddit.com',
          isComment: true
        },
        {
          title: `Kinyo ${item.title} Model UV-420 - ${item.title} Tape ... - Amazon.com`,
          description: `Buy Kinyo ${item.title} Model UV-420 - ${item.title} Winder (Black): ${item.title} Rewinders - Amazon.com ✓ FREE DELIVERY possible on eligible purchases.`,
          price: item.price ? item.price * 1.2 : 69.99,
          source: 'www.amazon.com',
          image: 'https://m.media-amazon.com/images/I/41WGDR5MPTL._AC_UL320_.jpg'
        }
      ];
      
      setPurchaseOptions(mockOptions);
      setShowPurchaseOptions(true);
    } catch (err) {
      console.error('Error finding purchase options:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while finding purchase options');
      }
    } finally {
      setLoadingPurchaseOptions(false);
    }
  };

  const findWhereToBuy = () => {
    if (!item) return;
    
    // Open a Google search in a new tab
    const searchQuery = encodeURIComponent(`buy ${item.title} online`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  };

  const handleProductSelect = async (product: ProductSearchResult) => {
    if (!item || !user) return;
    
    try {
      // Update the item with the selected product information
      const { error } = await supabase
        .from('items')
        .update({
          price: product.price,
          estimated_price: true,
          price_source: product.source,
          price_date: new Date().toISOString(),
          product_link: product.link,
          image_url: product.image || item.image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (error) throw error;
      
      // Update the local state
      setItem({
        ...item,
        price: product.price,
        estimated_price: true,
        price_source: product.source,
        price_date: new Date().toISOString(),
        product_link: product.link,
        image_url: product.image || item.image_url
      });
      
      // Close the modal
      setShowProductSearch(false);
      
    } catch (err) {
      console.error('Error updating item with product information:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while updating the item');
      }
    }
  };
  
  // Format item type for display
  const formatItemType = (type: string) => {
    switch (type) {
      case 'needed_supply':
        return 'Needed Supply';
      case 'owned_resource':
        return 'Owned Resource';
      case 'borrowed_or_rental':
        return 'Borrowed/Rental';
      default:
        return type;
    }
  };
  
  // Get item type color
  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'needed_supply':
        return 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200';
      case 'owned_resource':
        return 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200';
      case 'borrowed_or_rental':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Format currency
  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null) return '';
    
    const currencySymbols: {[key: string]: string} = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥'
    };
    
    const symbol = currencySymbols[currency] || '$';
    
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 dark:border-green-400"></div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/inventory')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Return to Inventory
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
        Item not found. It may have been deleted or you don't have access.
      </div>
    );
  }

  return (
    <>
      {/* Product Search Modal */}
      {showProductSearch && (
        <ProductSearchModal
          onClose={() => setShowProductSearch(false)}
          onSelect={handleProductSelect}
          initialQuery={item.title}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-300 ease-in-out">
            <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Delete Item</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">Are you sure you want to delete "{item.title}"? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center font-medium shadow-sm"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Options Modal */}
      {showPurchaseOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl mx-4 transform transition-all duration-300 ease-in-out w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Purchase Options for "{item.title}"
              </h3>
              <button 
                onClick={() => setShowPurchaseOptions(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {purchaseOptions.map((option, index) => (
                <div key={index} className="flex gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {option.image && (
                    <div className="w-16 h-16 flex-shrink-0">
                      <img 
                        src={option.image} 
                        alt={option.title} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 dark:text-gray-100">{option.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{option.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Source: {option.source}
                      </div>
                      {option.isComment ? (
                        <div className="text-green-600 dark:text-green-400 font-medium">
                          ${option.price.toFixed(2)}
                        </div>
                      ) : (
                        <button
                          className="bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                          onClick={() => {
                            window.open(`https://${option.source}`, '_blank');
                          }}
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPurchaseOptions(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center">
                <Package className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
                {item.title}
              </h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getItemTypeColor(item.item_type)}`}>
                  {formatItemType(item.item_type)}
                </span>
                
                {item.fundraiser && (
                  <span className="bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                    Fundraising Needed
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Link
                to={`/inventory/edit/${item.id}`}
                className="bg-blue-600 dark:bg-blue-700 text-white p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                <Edit className="h-5 w-5" />
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 dark:bg-red-700 text-white p-2 rounded hover:bg-red-700 dark:hover:bg-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Action buttons for needed supplies */}
          {item.item_type === 'needed_supply' && (
            <div className="mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Mark as Acquired</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                      Have you acquired this item? Convert it from a needed supply to an owned resource.
                    </p>
                    <button
                      onClick={handleMarkAsOwned}
                      className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors shadow-sm flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Owned
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Purchase options for needed supplies */}
          {item.item_type === 'needed_supply' && (
            <div className="mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-1">Find Purchase Options</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                      Find where you can buy this item online and get current pricing information.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowProductSearch(true)}
                        className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm flex items-center"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Search Products
                      </button>
                      
                      <button
                        onClick={findWhereToBuy}
                        className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Find Where to Buy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {item.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Description</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{item.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Quantity & Details</h2>
              
              <div className="space-y-3">
                {/* Show quantities based on item type */}
                {item.item_type === 'needed_supply' && item.quantity_needed !== null && (
                  <div className="flex items-start">
                    <div className="h-6 w-6 bg-yellow-100 dark:bg-yellow-900/60 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-yellow-800 dark:text-yellow-200 text-xs font-bold">N</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Quantity Needed</p>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">
                        {item.quantity_needed} {item.unit || 'units'}
                      </p>
                    </div>
                  </div>
                )}
                
                {item.item_type === 'owned_resource' && item.quantity_owned !== null && (
                  <div className="flex items-start">
                    <div className="h-6 w-6 bg-green-100 dark:bg-green-900/60 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-green-800 dark:text-green-200 text-xs font-bold">O</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Quantity Owned</p>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">
                        {item.quantity_owned} {item.unit || 'units'}
                      </p>
                    </div>
                  </div>
                )}
                
                {item.item_type === 'borrowed_or_rental' && item.quantity_borrowed !== null && (
                  <div className="flex items-start">
                    <div className="h-6 w-6 bg-blue-100 dark:bg-blue-900/60 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <span className="text-blue-800 dark:text-blue-200 text-xs font-bold">B</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Quantity Borrowed</p>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">
                        {item.quantity_borrowed} {item.unit || 'units'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Price information */}
                {item.price !== null && (
                  <div className="flex items-start">
                    <div className="h-6 w-6 bg-purple-100 dark:bg-purple-900/60 rounded-full flex items-center justify-center mr-2 mt-0.5">
                      <DollarSign className="h-3.5 w-3.5 text-purple-800 dark:text-purple-200" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.item_type === 'needed_supply' ? 'Price' : 'Value'}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 font-medium">
                        {formatCurrency(item.price, item.price_currency || 'USD')}
                        {item.estimated_price && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(estimated)</span>}
                      </p>
                      {item.price_source && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Source: {item.price_source}
                        </p>
                      )}
                      {item.price_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Updated: {new Date(item.price_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Associations */}
                {projectName && (
                  <div className="flex items-start">
                    <Folder className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                      <Link 
                        to={`/projects/${item.project_id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {projectName}
                      </Link>
                    </div>
                  </div>
                )}
                
                {taskName && (
                  <div className="flex items-start">
                    <CheckSquare className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Task</p>
                      <Link 
                        to={`/tasks/${item.associated_task_id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {taskName}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Additional Information</h2>
              
              <div className="space-y-4">
                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-sm flex items-center">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Links */}
                <div className="space-y-2">
                  {item.product_link && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Product Link</p>
                      <a 
                        href={item.product_link}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {item.product_link.length > 40 
                          ? `${item.product_link.substring(0, 40)}...` 
                          : item.product_link}
                      </a>
                    </div>
                  )}
                  
                  {item.info_link && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Information Link</p>
                      <a 
                        href={item.info_link}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {item.info_link.length > 40 
                          ? `${item.info_link.substring(0, 40)}...` 
                          : item.info_link}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Assignees Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
              <Users className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
              Assignees
            </h2>
            
            {assignees.length > 0 ? (
              <MemberList 
                members={assignees}
                isEditable={false}
              />
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 text-center">No assignees for this item</p>
              </div>
            )}
          </div>
          
          {/* Item Image */}
          {item.image_url && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                Item Image
              </h2>
              <div className="flex justify-center">
                <img 
                  src={item.image_url} 
                  alt={item.title}
                  className="max-w-full max-h-[400px] rounded-lg shadow-md object-contain" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
          
          <div className="flex justify-between mt-8">
            <Link
              to="/inventory"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              ← Back to Inventory
            </Link>
            
            {item.project_id && (
              <Link
                to={`/projects/${item.project_id}/inventory`}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                Back to Project Inventory
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InventoryItemDetailView;