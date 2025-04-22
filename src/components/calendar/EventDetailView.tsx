import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { Calendar, Clock, MapPin, Edit, Trash2, Folder, User, AlertTriangle, Repeat, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import MemberList from '../common/MemberList';

type Event = Database['public']['Tables']['events']['Row'];

interface Member {
  id: string;
  name: string;
  email: string;
}

const EventDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchEvent = async () => {
      try {
        // Fetch event
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
          
        if (eventError) throw eventError;
        
        if (!eventData) {
          setError('Event not found');
          return;
        }
        
        setEvent(eventData);
        
        // Fetch project name if event is associated with a project
        if (eventData.project_id) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('title')
            .eq('id', eventData.project_id)
            .single();
            
          if (projectError) console.error('Error fetching project:', projectError);
          else setProjectName(projectData?.title || null);
        }
        
        // Fetch attendees
        if (eventData.attendees && eventData.attendees.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', eventData.attendees);
            
          if (profilesError) {
            console.error('Error fetching attendees:', profilesError);
          } else if (profiles) {
            const memberList: Member[] = profiles.map(profile => ({
              id: profile.user_id,
              name: profile.name || 'Team Member',
              email: profile.email || ''
            }));
            setAttendees(memberList);
          }
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the event');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [id, user]);
  
  const handleDelete = async () => {
    if (!event || !user) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);
        
      if (error) throw error;
      
      // Navigate back to calendar or project calendar
      if (event.is_project_event && event.project_id) {
        navigate(`/projects/${event.project_id}/calendar`);
      } else {
        navigate('/calendar');
      }
      
    } catch (err) {
      console.error('Error deleting event:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while deleting the event');
      }
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };
  
  // Format recurring pattern for display
  const formatRecurringPattern = (pattern: string) => {
    switch (pattern) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Every two weeks';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return pattern;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/calendar')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Return to Calendar
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 p-4 rounded-md">
        Event not found. It may have been deleted or you don't have access.
      </div>
    );
  }

  // Format dates for display
  const formattedStartDate = format(parseISO(event.start_date), 'EEEE, MMMM d, yyyy');
  const formattedEndDate = event.end_date ? format(parseISO(event.end_date), 'EEEE, MMMM d, yyyy') : null;
  const formattedRecurringEndDate = event.recurring_end_date ? format(parseISO(event.recurring_end_date), 'MMMM d, yyyy') : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-300 ease-in-out">
            <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <h3 className="text-xl font-bold">Delete Event</h3>
            </div>
            <p className="mb-6 text-gray-600 dark:text-gray-300">Are you sure you want to delete "{event.title}"? This action cannot be undone.</p>
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
      
      <div 
        className="h-16 relative" 
        style={{ backgroundColor: event.color || (event.is_project_event ? '#4f46e5' : '#10b981') }}
      >
        <div className="absolute top-4 right-4 flex space-x-2">
          <button 
            className="bg-white bg-opacity-20 text-white p-2 rounded-lg hover:bg-opacity-30 transition-colors"
            onClick={() => navigate(`/events/edit/${event.id}`)}
          >
            <Edit className="h-5 w-5" />
          </button>
          <button 
            className="bg-white bg-opacity-20 text-white p-2 rounded-lg hover:bg-opacity-30 transition-colors"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{event.title}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="space-y-4">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="text-gray-800 dark:text-gray-200 font-medium">
                    {formattedStartDate}
                    {formattedEndDate && formattedEndDate !== formattedStartDate && (
                      <span> to {formattedEndDate}</span>
                    )}
                  </p>
                </div>
              </div>
              
              {!event.all_day && event.start_time && (
                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">
                      {event.start_time}
                      {event.end_time && (
                        <span> to {event.end_time}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              {event.all_day && (
                <div className="flex items-start">
                  <Clock className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">All day</p>
                  </div>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{event.location}</p>
                  </div>
                </div>
              )}
              
              {event.is_project_event && projectName && (
                <div className="flex items-start">
                  <Folder className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Project</p>
                    <Link 
                      to={`/projects/${event.project_id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {projectName}
                    </Link>
                  </div>
                </div>
              )}
              
              {event.recurring && (
                <div className="flex items-start">
                  <Repeat className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Recurring</p>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">
                      {formatRecurringPattern(event.recurring_pattern || 'weekly')}
                      {formattedRecurringEndDate && (
                        <span> until {formattedRecurringEndDate}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            {event.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Description</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{event.description}</p>
              </div>
            )}
            
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                Attendees
              </h2>
              
              {attendees.length > 0 ? (
                <MemberList 
                  members={attendees}
                  isEditable={false}
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 text-center">No attendees for this event</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <Link
            to="/calendar"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            ← Back to Calendar
          </Link>
          
          {event.is_project_event && event.project_id && (
            <Link
              to={`/projects/${event.project_id}/calendar`}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              Back to Project Calendar
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailView;