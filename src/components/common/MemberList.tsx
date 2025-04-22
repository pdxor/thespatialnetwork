import React from 'react';
import { User, X, UserPlus, Mail } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
}

interface MemberListProps {
  members: Member[];
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  isEditable?: boolean;
  emptyMessage?: string;
}

const MemberList: React.FC<MemberListProps> = ({ 
  members, 
  onRemove, 
  onAdd, 
  isEditable = true,
  emptyMessage = "No members assigned"
}) => {
  return (
    <div className="space-y-2">
      {members.length > 0 ? (
        <div className="space-y-2">
          {members.map((member) => (
            <div 
              key={member.id} 
              className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-teal-800 dark:to-teal-700 rounded-full flex items-center justify-center mr-3 shadow-sm">
                  <User className="h-5 w-5 text-green-700 dark:text-cyan-300" />
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-100">{member.name || 'Unnamed User'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Mail className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
                    {member.email}
                  </div>
                </div>
              </div>
              {isEditable && onRemove && (
                <button 
                  onClick={() => onRemove(member.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                  title="Remove member"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      )}
      
      {isEditable && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full mt-3 flex items-center justify-center py-2.5 px-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-cyan-400 hover:border-green-500 dark:hover:border-cyan-500 hover:bg-green-50 dark:hover:bg-teal-900/20 transition-all duration-200"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Add Member
        </button>
      )}
    </div>
  );
};

export default MemberList;