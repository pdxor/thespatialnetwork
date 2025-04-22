import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Search, UserPlus, X } from 'lucide-react';

interface MemberSearchProps {
  onSelect: (member: { id: string; name: string; email: string }) => void;
  excludeIds?: string[];
  placeholder?: string;
}

const MemberSearch: React.FC<MemberSearchProps> = ({ 
  onSelect, 
  excludeIds = [], 
  placeholder = "Search members by email..." 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchMembers = async () => {
      if (searchTerm.length < 3) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, name, email')
          .ilike('email', `%${searchTerm}%`)
          .limit(5);

        if (error) throw error;
        
        // Filter out excluded IDs
        const filteredData = data?.filter(member => 
          !excludeIds.includes(member.user_id)
        ) || [];
        
        setSearchResults(filteredData);
      } catch (err) {
        console.error('Error searching members:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (searchTerm.length >= 3) {
        searchMembers();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, excludeIds]);

  const handleSelectMember = (member: any) => {
    onSelect({
      id: member.user_id,
      name: member.name,
      email: member.email
    });
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-teal-500 focus:border-green-500 dark:focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 shadow-sm"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
        {searchTerm && (
          <button 
            className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            onClick={() => {
              setSearchTerm('');
              setSearchResults([]);
            }}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((member) => (
            <div
              key={member.id}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center transition-colors duration-150"
              onClick={() => handleSelectMember(member)}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-teal-800 dark:to-teal-700 rounded-full flex items-center justify-center mr-3 shadow-sm">
                <User className="h-5 w-5 text-green-700 dark:text-cyan-300" />
              </div>
              <div>
                <div className="font-medium text-gray-800 dark:text-gray-100">{member.name || 'Unnamed User'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchTerm.length >= 3 && searchResults.length === 0 && !loading && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No users found with that email</p>
          <button 
            className="mt-2 text-green-600 dark:text-cyan-400 hover:text-green-800 dark:hover:text-cyan-300 flex items-center justify-center w-full py-2 border border-green-300 dark:border-teal-700 rounded-md hover:bg-green-50 dark:hover:bg-teal-900/20 transition-colors duration-150"
            onClick={() => setShowResults(false)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite new member
          </button>
        </div>
      )}

      {loading && (
        <div className="absolute right-3 top-2.5">
          <div className="animate-spin h-5 w-5 border-2 border-green-500 dark:border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default MemberSearch;