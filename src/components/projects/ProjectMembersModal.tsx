import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Mail, Shield, AlertCircle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import MemberSearch from '../common/MemberSearch';
import MemberList from '../common/MemberList';

interface Member {
  id: string;
  name: string;
  email: string;
}

interface ProjectMembersModalProps {
  projectId: string;
  onClose: () => void;
}

const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({ projectId, onClose }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');

  useEffect(() => {
    fetchProjectMembers();
    checkOwnership();
  }, [projectId]);

  const checkOwnership = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('created_by, title')
        .eq('id', projectId)
        .single();
        
      if (error) throw error;
      
      setIsOwner(data.created_by === user?.id);
      setProjectTitle(data.title);
    } catch (err) {
      console.error('Error checking project ownership:', err);
    }
  };

  const fetchProjectMembers = async () => {
    setLoading(true);
    try {
      // First get the project to check if current user is the owner
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('created_by, team')
        .eq('id', projectId)
        .single();
        
      if (projectError) throw projectError;
      
      // Get team members from the team array
      if (project && project.team && project.team.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', project.team);
          
        if (profilesError) throw profilesError;
        
        // Also get the owner's profile
        const { data: ownerProfile, error: ownerError } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .eq('user_id', project.created_by)
          .single();
          
        if (ownerError && ownerError.code !== 'PGRST116') throw ownerError;
        
        const membersList: Member[] = [];
        
        // Add owner first
        if (ownerProfile) {
          membersList.push({
            id: ownerProfile.user_id,
            name: ownerProfile.name || 'Project Owner',
            email: ownerProfile.email || ''
          });
        }
        
        // Add team members
        if (profiles) {
          profiles.forEach(profile => {
            // Don't add owner twice
            if (profile.user_id !== project.created_by) {
              membersList.push({
                id: profile.user_id,
                name: profile.name || 'Team Member',
                email: profile.email || ''
              });
            }
          });
        }
        
        setMembers(membersList);
      } else {
        // Only the owner is a member
        const { data: ownerProfile, error: ownerError } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .eq('user_id', project.created_by)
          .single();
          
        if (ownerError) throw ownerError;
        
        setMembers([{
          id: ownerProfile.user_id,
          name: ownerProfile.name || 'Project Owner',
          email: ownerProfile.email || ''
        }]);
      }
    } catch (err) {
      console.error('Error fetching project members:', err);
      setError('Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (newMember: Member) => {
    try {
      // Get current team array
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('team')
        .eq('id', projectId)
        .single();
        
      if (projectError) throw projectError;
      
      // Create a new team array with the new member
      const updatedTeam = project.team ? [...project.team, newMember.id] : [newMember.id];
      
      // Update the project
      const { error: updateError } = await supabase
        .from('projects')
        .update({ team: updatedTeam })
        .eq('id', projectId);
        
      if (updateError) throw updateError;
      
      // Add to local state
      setMembers([...members, newMember]);
      setSuccess(`${newMember.name || newMember.email} added to the project`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding team member:', err);
      setError('Failed to add team member');
      
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    // Don't allow removing the owner
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();
      
    if (projectError) {
      console.error('Error checking project ownership:', projectError);
      setError('Failed to verify project ownership');
      return;
    }
    
    if (project.created_by === memberId) {
      setError('Cannot remove the project owner');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      // Get current team array
      const { data, error: teamError } = await supabase
        .from('projects')
        .select('team')
        .eq('id', projectId)
        .single();
        
      if (teamError) throw teamError;
      
      // Create a new team array without the removed member
      const updatedTeam = data.team.filter((id: string) => id !== memberId);
      
      // Update the project
      const { error: updateError } = await supabase
        .from('projects')
        .update({ team: updatedTeam })
        .eq('id', projectId);
        
      if (updateError) throw updateError;
      
      // Update local state
      setMembers(members.filter(member => member.id !== memberId));
      setSuccess('Team member removed');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error removing team member:', err);
      setError('Failed to remove team member');
      
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Users className="h-5 w-5 mr-2 text-green-600 dark:text-cyan-500" />
            Project Team
            {projectTitle && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                {projectTitle}
              </span>
            )}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-600 text-green-700 dark:text-green-300 p-4 rounded-md mb-4">
            {success}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 dark:border-cyan-500"></div>
          </div>
        ) : (
          <>
            {isOwner && (
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
                  Add Team Member
                </label>
                <MemberSearch 
                  onSelect={handleAddMember} 
                  excludeIds={members.map(m => m.id)}
                  placeholder="Search by email address..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  Team members will be able to view and contribute to this project
                </p>
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-200">Current Members</h4>
                <span className="text-xs bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 py-1 px-2 rounded-full">
                  {members.length} {members.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>
              
              {/* Owner badge for first member */}
              {members.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100 dark:from-teal-900/30 dark:to-teal-800/30 p-3 rounded-lg border border-green-200 dark:border-teal-800 shadow-sm">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-200 to-green-300 dark:from-teal-800 dark:to-teal-700 rounded-full flex items-center justify-center mr-3 shadow-sm">
                        <User className="h-5 w-5 text-green-800 dark:text-cyan-300" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-100 flex items-center">
                          {members[0].name || 'Project Owner'}
                          <span className="ml-2 text-xs bg-green-200 dark:bg-teal-800 text-green-800 dark:text-cyan-200 py-0.5 px-2 rounded-full flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            Owner
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <Mail className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
                          {members[0].email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Other team members */}
              {members.length > 1 && (
                <MemberList 
                  members={members.slice(1)} 
                  onRemove={isOwner ? handleRemoveMember : undefined}
                  isEditable={isOwner}
                />
              )}
              
              {members.length <= 1 && (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed">
                  <p className="text-gray-500 dark:text-gray-400">No additional team members</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectMembersModal;