import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Award, User, ArrowLeft } from 'lucide-react';
import BadgeCard from './BadgeCard';

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  task_id: string | null;
  earned_at: string;
  badges: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    created_by: string;
    created_at: string;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

const UserBadgesView: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if viewing current user's badges
    const viewingUserId = userId || user.id;
    setIsCurrentUser(viewingUserId === user.id);
    
    const fetchUserBadges = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, name, email, avatar_url')
          .eq('user_id', viewingUserId)
          .single();
          
        if (profileError) throw profileError;
        
        if (!profileData) {
          setError('User not found');
          return;
        }
        
        setUserProfile(profileData);
        
        // Fetch user's badges
        const { data: badgesData, error: badgesError } = await supabase
          .from('user_badges')
          .select(`
            id,
            user_id,
            badge_id,
            task_id,
            earned_at,
            badges (
              id,
              title,
              description,
              image_url,
              created_by,
              created_at
            )
          `)
          .eq('user_id', viewingUserId)
          .order('earned_at', { ascending: false });
          
        if (badgesError) throw badgesError;
        
        setUserBadges(badgesData || []);
        
      } catch (err) {
        console.error('Error fetching user badges:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading badges');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserBadges();
  }, [user, userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error || 'User not found'}</p>
        <div className="mt-4">
          <Link
            to="/badges"
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Return to Badges
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          to="/badges"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Badges
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center">
          <div className="mr-4">
            {userProfile.avatar_url ? (
              <img 
                src={userProfile.avatar_url} 
                alt={userProfile.name} 
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
              {isCurrentUser ? 'My Badges' : `${userProfile.name}'s Badges`}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {userBadges.length} {userBadges.length === 1 ? 'badge' : 'badges'} earned
            </p>
          </div>
        </div>
      </div>
      
      {userBadges.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="h-10 w-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
            {isCurrentUser ? "You haven't earned any badges yet" : `${userProfile.name} hasn't earned any badges yet`}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
            {isCurrentUser 
              ? "Complete tasks that award badges to earn them and show off your achievements!" 
              : "When they complete tasks that award badges, they'll appear here."}
          </p>
          {isCurrentUser && (
            <Link
              to="/tasks"
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-500 transition-all duration-200 shadow-sm font-medium"
            >
              View Available Tasks
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {userBadges.map((userBadge) => (
            <Link key={userBadge.id} to={`/badges/${userBadge.badge_id}`}>
              <BadgeCard 
                badge={userBadge.badges} 
                isCreator={userBadge.badges.created_by === user?.id}
                isEarned={true}
                earnedAt={userBadge.earned_at}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBadgesView;