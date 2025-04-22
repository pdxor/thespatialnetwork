import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { Package, Folder, CheckSquare, Save, Tags, Link as LinkIcon, Image, Users, UserPlus, DollarSign, Sparkles, Search } from 'lucide-react';
import MemberSearch from '../common/MemberSearch';
import MemberList from '../common/MemberList';
import ProductSearchModal from './ProductSearchModal';

type Project = Database['public']['Tables']['projects']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

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

const InventoryItemCreateForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get task_id or project_id from query params if present
  const queryParams = new URLSearchParams(location.search);
  const taskIdFromQuery = queryParams.get('task_id');
  const projectIdFromQuery = queryParams.get('project_id');
  const typeFromQuery = queryParams.get('type');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<'needed_supply' | 'owned_resource' | 'borrowed_or_rental'>(
    typeFromQuery === 'owned_resource' ? 'owned_resource' : 
    typeFromQuery === 'borrowed_or_rental' ? 'borrowed_or_rental' : 
    'needed_supply'
  );
  const [isFundraiser, setIsFundraiser] = useState(false);
  const [quantityNeeded, setQuantityNeeded] = useState<number | ''>('');
  const [quantityOwned, setQuantityOwned] = useState<number | ''>('');
  const [quantityBorrowed, setQuantityBorrowed] = useState<number | ''>('');
  const [unit, setUnit] = useState('');
  const [productLink, setProductLink] = useState('');
  const [infoLink, setInfoLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [projectId, setProjectId] = useState(projectIdFromQuery || '');
  const [taskId, setTaskId] = useState(taskIdFromQuery || '');
  const [assignees, setAssignees] = useState<Member[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  // Price information
  const [price, setPrice] = useState<number | ''>('');
  const [estimatedPrice, setEstimatedPrice] = useState(false);
  const [priceCurrency, setPriceCurrency] = useState('USD');
  const [priceSource, setPriceSource] = useState('');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [estimatingPrice, setEstimatingPrice] = useState(false);
  
  // Fetch user's projects
  useEffect(() => {
    if (!user) return;
    
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .or(`created_by.eq.${user.id},team.cs.{${user.id}}`)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    
    fetchProjects();
  }, [user]);
  
  // Fetch tasks when project is selected
  useEffect(() => {
    if (!user || !projectId) {
      setTasks([]);
      return;
    }
    
    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setTasks(data || []);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };
    
    fetchTasks();
  }, [user, projectId]);

  // Fetch current user's profile to add as default assignee
  useEffect(() => {
    if (!user) return;
    
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setAssignees([{
            id: user.id,
            name: data.name || 'Me',
            email: data.email || ''
          }]);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  const handleAddAssignee = (member: Member) => {
    if (!assignees.some(a => a.id === member.id)) {
      setAssignees([...assignees, member]);
    }
    setShowMemberSearch(false);
  };
  
  const handleRemoveAssignee = (id: string) => {
    setAssignees(assignees.filter(a => a.id !== id));
  };
  
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleEstimatePrice = async () => {
    if (!user || !title) {
      setError("Please provide a title to estimate price");
      return;
    }
    
    setEstimatingPrice(true);
    setError(null);
    
    try {
      // Generate a prompt based on item details
      const prompt = `Estimate the current market price in USD for: ${title}. ${description ? `Description: ${description}` : ''}`;
      
      // Call OpenAI API through our wrapper
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/estimate-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ prompt, userId: user.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to estimate price');
      }
      
      const data = await response.json();
      
      if (data && data.price) {
        setPrice(data.price);
        setEstimatedPrice(true);
        setPriceSource('AI Estimation');
      } else {
        throw new Error('Could not determine price from AI response');
      }
    } catch (err) {
      console.error('Error estimating price:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to estimate price. Please enter manually.');
      }
    } finally {
      setEstimatingPrice(false);
    }
  };

  const handleProductSelect = (product: ProductSearchResult) => {
    // Update form with product information
    if (product.title && !title) {
      setTitle(product.title);
    }
    
    if (product.price !== null) {
      setPrice(product.price);
      setEstimatedPrice(true);
      setPriceSource(product.source);
    }
    
    if (product.link) {
      setProductLink(product.link);
    }
    
    if (product.image) {
      setImageUrl(product.image);
    }
    
    // Close the modal
    setShowProductSearch(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Convert empty string to null for number fields
      const parsedQuantityNeeded = quantityNeeded === '' ? null : Number(quantityNeeded);
      const parsedQuantityOwned = quantityOwned === '' ? null : Number(quantityOwned);
      const parsedQuantityBorrowed = quantityBorrowed === '' ? null : Number(quantityBorrowed);
      const parsedPrice = price === '' ? null : Number(price);
      
      // Validate that at least one quantity is provided based on item type
      if (
        (itemType === 'needed_supply' && parsedQuantityNeeded === null) ||
        (itemType === 'owned_resource' && parsedQuantityOwned === null) ||
        (itemType === 'borrowed_or_rental' && parsedQuantityBorrowed === null)
      ) {
        throw new Error(`Please provide a quantity for this ${formatItemType(itemType)}`);
      }
      
      // Inventory item data
      const itemData = {
        title,
        description: description || null,
        item_type: itemType,
        fundraiser: isFundraiser,
        tags: tags.length > 0 ? tags : null,
        quantity_needed: parsedQuantityNeeded,
        quantity_owned: parsedQuantityOwned,
        quantity_borrowed: parsedQuantityBorrowed,
        unit: unit || null,
        product_link: productLink || null,
        info_link: infoLink || null,
        image_url: imageUrl || null,
        associated_task_id: taskId || null,
        project_id: projectId || null,
        added_by: user.id,
        assignees: assignees.map(a => a.id), // Add assignees
        // Price information
        price: parsedPrice,
        estimated_price: parsedPrice !== null ? estimatedPrice : null,
        price_currency: parsedPrice !== null ? priceCurrency : null,
        price_date: parsedPrice !== null ? new Date().toISOString() : null,
        price_source: parsedPrice !== null ? priceSource || null : null
      };
      
      // Insert item into database
      const { data, error } = await supabase
        .from('items')
        .insert(itemData)
        .select('id')
        .single();
        
      if (error) throw error;
      
      setSuccess('Inventory item created successfully!');
      
      // Navigate to appropriate page after success
      setTimeout(() => {
        if (projectId) {
          navigate(`/projects/${projectId}/inventory`);
        } else if (taskId) {
          navigate(`/tasks/${taskId}`);
        } else {
          navigate('/inventory');
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error creating inventory item:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while creating the inventory item');
      }
    } finally {
      setLoading(false);
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <Package className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
        Add Inventory Item
      </h1>
      
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

      {/* Product Search Modal */}
      {showProductSearch && (
        <ProductSearchModal
          onClose={() => setShowProductSearch(false)}
          onSelect={handleProductSelect}
          initialQuery={title}
        />
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium" htmlFor="title">
              Item Title *
            </label>
            <button
              type="button"
              onClick={() => setShowProductSearch(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
            >
              <Search className="h-4 w-4 mr-1" />
              Search Products
            </button>
          </div>
          <input
            id="title"
            type="text"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter item title"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter item description (optional)"
            rows={3}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="itemType">
            Item Type *
          </label>
          <div className="relative">
            <Package className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <select
              id="itemType"
              className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as any)}
              required
            >
              <option value="needed_supply">Needed Supply</option>
              <option value="owned_resource">Owned Resource</option>
              <option value="borrowed_or_rental">Borrowed/Rental</option>
            </select>
            <div className="absolute right-3 top-3 pointer-events-none">
              <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="mb-4 flex items-center">
          <input
            id="isFundraiser"
            type="checkbox"
            className="h-4 w-4 text-green-500 dark:text-green-400 focus:ring-green-400 dark:focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
            checked={isFundraiser}
            onChange={(e) => setIsFundraiser(e.target.checked)}
          />
          <label className="ml-2 block text-gray-700 dark:text-gray-200 text-sm font-medium" htmlFor="isFundraiser">
            This item needs fundraising
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Show different quantity fields based on item type */}
          {itemType === 'needed_supply' && (
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="quantityNeeded">
                Quantity Needed *
              </label>
              <input
                id="quantityNeeded"
                type="number"
                min="0"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={quantityNeeded}
                onChange={(e) => setQuantityNeeded(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
          )}
          
          {itemType === 'owned_resource' && (
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="quantityOwned">
                Quantity Owned *
              </label>
              <input
                id="quantityOwned"
                type="number"
                min="0"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={quantityOwned}
                onChange={(e) => setQuantityOwned(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
          )}
          
          {itemType === 'borrowed_or_rental' && (
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="quantityBorrowed">
                Quantity Borrowed *
              </label>
              <input
                id="quantityBorrowed"
                type="number"
                min="0"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={quantityBorrowed}
                onChange={(e) => setQuantityBorrowed(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="unit">
              Unit of Measurement
            </label>
            <input
              id="unit"
              type="text"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., pieces, kg, meters"
            />
          </div>
        </div>
        
        {/* Price Information */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
              Price Information
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowProductSearch(true)}
                className="text-sm bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center"
              >
                <Search className="h-4 w-4 mr-1" />
                Search Products
              </button>
              <button
                type="button"
                onClick={handleEstimatePrice}
                disabled={estimatingPrice || !title}
                className="text-sm bg-purple-600 dark:bg-purple-700 text-white px-3 py-1 rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-purple-300 dark:disabled:bg-purple-800 disabled:cursor-not-allowed flex items-center"
              >
                {estimatingPrice ? (
                  <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Estimate Price
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="price">
                Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="priceCurrency">
                Currency
              </label>
              <select
                id="priceCurrency"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="priceSource">
              Price Source
            </label>
            <input
              id="priceSource"
              type="text"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={priceSource}
              onChange={(e) => setPriceSource(e.target.value)}
              placeholder="e.g., Amazon, Home Depot, local store"
            />
          </div>
          
          <div className="flex items-center">
            <input
              id="estimatedPrice"
              type="checkbox"
              className="h-4 w-4 text-green-500 dark:text-green-400 focus:ring-green-400 dark:focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
              checked={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.checked)}
            />
            <label className="ml-2 block text-gray-700 dark:text-gray-200 text-sm" htmlFor="estimatedPrice">
              This is an estimated price
            </label>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, index) => (
              <div 
                key={index}
                className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-sm flex items-center"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex">
            <div className="relative flex-1">
              <Tags className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                className="w-full pl-10 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag (e.g., tools, materials, garden)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-r-md hover:bg-gray-700 dark:hover:bg-gray-600"
              onClick={handleAddTag}
            >
              Add
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="productLink">
            Product Link
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              id="productLink"
              type="url"
              className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="https://example.com/product"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="infoLink">
            Information Link
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              id="infoLink"
              type="url"
              className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={infoLink}
              onChange={(e) => setInfoLink(e.target.value)}
              placeholder="https://example.com/info"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="imageUrl">
            Image URL
          </label>
          <div className="relative">
            <Image className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <input
              id="imageUrl"
              type="url"
              className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="projectId">
              Associated Project
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                id="projectId"
                className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setTaskId(''); // Reset task when project changes
                }}
              >
                <option value="">Select a project (optional)</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="taskId">
              Associated Task
            </label>
            <div className="relative">
              <CheckSquare className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                id="taskId"
                className="w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!projectId || tasks.length === 0}
              >
                <option value="">Select a task (optional)</option>
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {projectId && tasks.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No tasks available for this project</p>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2 flex justify-between">
            <span>Assignees</span>
            {!showMemberSearch && (
              <button 
                type="button" 
                onClick={() => setShowMemberSearch(true)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Assignee
              </button>
            )}
          </label>
          
          {showMemberSearch ? (
            <div className="mb-4">
              <MemberSearch 
                onSelect={handleAddAssignee}
                excludeIds={assignees.map(a => a.id)}
                placeholder="Search by email address..."
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberSearch(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          
          <MemberList 
            members={assignees}
            onRemove={handleRemoveAssignee}
            onAdd={() => setShowMemberSearch(true)}
            emptyMessage="No assignees selected"
          />
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Assignees will be responsible for managing this inventory item.
          </p>
        </div>
        
        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-green-600 dark:bg-green-700 text-white py-2 px-6 rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Create Item
              </>
            )}
          </button>
          
          <button
            type="button"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryItemCreateForm;