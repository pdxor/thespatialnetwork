import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { DollarSign, Edit, ShoppingCart, Package, CheckCircle, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type InventoryItem = Database['public']['Tables']['items']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

interface BudgetTrackerProps {
  projectId: string;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ projectId }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBudget, setTotalBudget] = useState<number | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectAndItems = async () => {
      try {
        setLoading(true);
        
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (projectError) throw projectError;
        
        setProject(projectData);
        
        // If project has a budget stored in funding_needs, parse it
        if (projectData.funding_needs) {
          // Try to parse as number, removing any non-numeric characters except decimal point
          const numericValue = projectData.funding_needs.replace(/[^0-9.]/g, '');
          if (numericValue) {
            setTotalBudget(parseFloat(numericValue));
            setBudgetInput(numericValue);
          }
        }
        
        // Fetch inventory items for this project
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('project_id', projectId);
          
        if (itemsError) throw itemsError;
        
        setItems(itemsData || []);
      } catch (err) {
        console.error('Error fetching budget data:', err);
        setError('Failed to load budget information');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndItems();
  }, [projectId]);

  const calculateNeededSuppliesCost = () => {
    return items
      .filter(item => item.item_type === 'needed_supply')
      .reduce((total, item) => {
        const price = item.price || 0;
        const quantity = item.quantity_needed || 1;
        return total + (price * quantity);
      }, 0);
  };

  const calculateOwnedResourcesValue = () => {
    return items
      .filter(item => item.item_type === 'owned_resource')
      .reduce((total, item) => {
        const price = item.price || 0;
        const quantity = item.quantity_owned || 1;
        return total + (price * quantity);
      }, 0);
  };

  const handleSaveBudget = async () => {
    if (!project) return;
    
    try {
      const budget = parseFloat(budgetInput);
      if (isNaN(budget)) {
        setError('Please enter a valid number for the budget');
        return;
      }
      
      // Format as currency with $ prefix
      const formattedBudget = `$${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ funding_needs: formattedBudget })
        .eq('id', projectId);
        
      if (updateError) throw updateError;
      
      setTotalBudget(budget);
      setEditingBudget(false);
    } catch (err) {
      console.error('Error updating budget:', err);
      setError('Failed to update budget');
    }
  };

  const getBudgetStatus = () => {
    if (totalBudget === null) return 'Not set';
    
    const neededSuppliesCost = calculateNeededSuppliesCost();
    const remaining = totalBudget - neededSuppliesCost;
    
    if (remaining < 0) {
      return 'Over budget';
    } else if (remaining === 0) {
      return 'On budget';
    } else {
      return 'Under budget';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Over budget':
        return 'text-red-600 dark:text-red-400';
      case 'On budget':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Under budget':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 dark:border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        {error}
      </div>
    );
  }

  const neededSuppliesCost = calculateNeededSuppliesCost();
  const ownedResourcesValue = calculateOwnedResourcesValue();
  const budgetStatus = getBudgetStatus();
  const statusColor = getStatusColor(budgetStatus);
  const neededItems = items.filter(item => item.item_type === 'needed_supply');
  const ownedItems = items.filter(item => item.item_type === 'owned_resource');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
          <DollarSign className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
          Budget Overview
          <button 
            onClick={() => setEditingBudget(true)}
            className="ml-auto text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit Budget
          </button>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Budget</h3>
            {editingBudget ? (
              <div className="flex items-center">
                <span className="text-gray-700 dark:text-gray-300 mr-1">$</span>
                <input
                  type="text"
                  className="flex-1 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="Enter budget amount"
                  autoFocus
                />
                <button
                  onClick={handleSaveBudget}
                  className="ml-2 bg-green-600 dark:bg-green-700 text-white px-2 py-1 rounded-md hover:bg-green-700 dark:hover:bg-green-600 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingBudget(false)}
                  className="ml-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {totalBudget !== null ? formatCurrency(totalBudget) : 'Not set'}
              </p>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Needed Supplies Cost</h3>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {formatCurrency(neededSuppliesCost)}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Budget Status</h3>
            <p className={`text-2xl font-bold ${statusColor}`}>
              {budgetStatus}
            </p>
            {totalBudget !== null && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {totalBudget > neededSuppliesCost ? (
                  <>Remaining: {formatCurrency(totalBudget - neededSuppliesCost)}</>
                ) : totalBudget < neededSuppliesCost ? (
                  <>Deficit: {formatCurrency(neededSuppliesCost - totalBudget)}</>
                ) : (
                  <>Perfectly balanced</>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2 text-yellow-600 dark:text-yellow-400" />
            Needed Supplies
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({neededItems.length} items, {neededItems.filter(i => i.price).length} with prices)
            </span>
          </h2>
          
          <Link
            to={`/inventory/new?project_id=${projectId}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Item
          </Link>
        </div>
        
        {neededItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {neededItems.map(item => {
                  const quantity = item.quantity_needed || 1;
                  const price = item.price || 0;
                  const total = quantity * price;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/inventory/${item.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {quantity} {item.unit || 'units'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {price > 0 ? (
                          <span>
                            {formatCurrency(price)}
                            {item.estimated_price && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(est.)</span>}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {price > 0 ? formatCurrency(total) : '-'}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap" colSpan={3}>
                    Total Needed Supplies Cost
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 dark:text-green-400 font-bold">
                    {formatCurrency(neededSuppliesCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No needed supplies added yet</p>
            <Link
              to={`/inventory/new?project_id=${projectId}&type=needed_supply`}
              className="mt-4 inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add needed supplies
            </Link>
          </div>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Package className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
            Owned Resources
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({ownedItems.length} items, {ownedItems.filter(i => i.price).length} with prices)
            </span>
          </h2>
          
          <Link
            to={`/inventory/new?project_id=${projectId}&type=owned_resource`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Resource
          </Link>
        </div>
        
        {ownedItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unit Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {ownedItems.map(item => {
                  const quantity = item.quantity_owned || 1;
                  const price = item.price || 0;
                  const total = quantity * price;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/inventory/${item.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {quantity} {item.unit || 'units'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {price > 0 ? (
                          <span>
                            {formatCurrency(price)}
                            {item.estimated_price && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(est.)</span>}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {price > 0 ? formatCurrency(total) : '-'}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-medium">
                  <td className="px-6 py-4 whitespace-nowrap" colSpan={3}>
                    Total Owned Resources Value
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 dark:text-green-400 font-bold">
                    {formatCurrency(ownedResourcesValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <Package className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No owned resources added yet</p>
            <Link
              to={`/inventory/new?project_id=${projectId}&type=owned_resource`}
              className="mt-4 inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add owned resources
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTracker;