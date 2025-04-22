import React from 'react';
import { Database } from '../../types/supabase';
import { Calendar, AlertCircle, Folder, Users } from 'lucide-react';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskCardProps {
  task: Task & { projects?: { title: string } | null };
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  // Format date if available
  const formattedDate = task.due_date 
    ? new Date(task.due_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;
  
  // Determine priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200';
      case 'medium':
        return 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200';
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Get assignee count badge
  const getAssigneeCount = () => {
    if (!task.assignees || task.assignees.length === 0) {
      return null;
    }
    
    return (
      <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
        <Users className="h-3.5 w-3.5 mr-1" />
        {task.assignees.length}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{task.title}</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
      </div>
      
      {task.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        {formattedDate && (
          <div className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
            {formattedDate}
          </div>
        )}
        
        {task.is_project_task && task.projects && (
          <div className="flex items-center">
            <Folder className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" />
            {task.projects.title}
          </div>
        )}
        
        {getAssigneeCount()}
      </div>
    </div>
  );
};

export default TaskCard;