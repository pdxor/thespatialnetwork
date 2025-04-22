import React from 'react';
import { Database } from '../../types/supabase';
import { Package, Tag, Folder, CheckSquare, Users, DollarSign } from 'lucide-react';

type InventoryItem = Database['public']['Tables']['items']['Row'];

interface InventoryItemCardProps {
  item: InventoryItem & { 
    projects?: { title: string } | null;
    tasks?: { title: string } | null;
  };
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({ item }) => {
  // Get item type badge color
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

  // Get assignee count badge
  const getAssigneeCount = () => {
    if (!item.assignees || item.assignees.length === 0) {
      return null;
    }
    
    return (
      <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
        <Users className="h-3.5 w-3.5 mr-1" />
        {item.assignees.length}
      </div>
    );
  };

  // Format currency
  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null) return null;
    
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 h-full">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{item.title}</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getItemTypeColor(item.item_type)}`}>
          {formatItemType(item.item_type)}
        </span>
      </div>
      
      {item.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{item.description}</p>
      )}
      
      {/* Show quantities based on item type */}
      <div className="mb-3">
        {item.item_type === 'needed_supply' && item.quantity_needed !== null && (
          <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
            {item.quantity_needed} {item.unit || 'units'} needed
          </div>
        )}
        
        {item.item_type === 'owned_resource' && item.quantity_owned !== null && (
          <div className="text-sm text-green-700 dark:text-green-300 font-medium">
            {item.quantity_owned} {item.unit || 'units'} owned
          </div>
        )}
        
        {item.item_type === 'borrowed_or_rental' && item.quantity_borrowed !== null && (
          <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {item.quantity_borrowed} {item.unit || 'units'} borrowed
          </div>
        )}
        
        {/* Price information */}
        {item.price !== null && (
          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-1">
            <DollarSign className="h-3.5 w-3.5 mr-0.5 text-gray-500 dark:text-gray-400" />
            {formatCurrency(item.price, item.price_currency || 'USD')}
            {item.estimated_price && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(est.)</span>}
          </div>
        )}
      </div>
      
      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full flex items-center">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
              +{item.tags.length - 3} more
            </span>
          )}
        </div>
      )}
      
      {/* Associations */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        {item.project_id && item.projects && (
          <div className="flex items-center">
            <Folder className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
            {item.projects.title}
          </div>
        )}
        
        {item.associated_task_id && item.tasks && (
          <div className="flex items-center">
            <CheckSquare className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
            {item.tasks.title}
          </div>
        )}
        
        {getAssigneeCount()}
      </div>
    </div>
  );
};

export default InventoryItemCard;