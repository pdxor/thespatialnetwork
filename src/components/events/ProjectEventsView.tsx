import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Filter, Calendar as CalendarIcon, Search, X, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Database } from '../../types/supabase';
import './calendar-styles.css';

type Event = Database['public']['Tables']['events']['Row'];
type Project = Database['public']['Tables']['projects']['Row'];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource?: any;
  color?: string;
}

const ProjectEventsView: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [date, setDate] = useState(new Date());

  // Import moment dynamically to avoid SSR issues
  const [localizer, setLocalizer] = useState<any>(null);
  
  useEffect(() => {
    const loadMoment = async () => {
      try {
        const moment = (await import('moment')).default;
        setLocalizer(momentLocalizer(moment));
      } catch (err) {
        console.error('Error loading moment:', err);
        setError('Failed to load calendar dependencies');
      }
    };
    
    loadMoment();
  }, []);

  useEffect(() => {
    if (!projectId || !user) return;

    const fetchProjectAndEvents = async () => {
      try {
        setLoading(true);
        
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (projectError) throw projectError;
        
        if (!projectData) {
          setError('Project not found');
          return;
        }
        
        setProject(projectData);
        
        // Fetch events for this project
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('project_id', projectId)
          .order('start_date', { ascending: true });
          
        if (eventsError) throw eventsError;
        
        setEvents(eventsData || []);
      } catch (err) {
        console.error('Error fetching project events:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading project events');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndEvents();
  }, [projectId, user]);

  // Convert events to calendar format
  const calendarEvents = React.useMemo(() => {
    if (!events.length || !localizer) return [];
    
    return events
      .filter(event => {
        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = event.title.toLowerCase().includes(query);
          const matchesDescription = event.description ? event.description.toLowerCase().includes(query) : false;
          const matchesLocation = event.location ? event.location.toLowerCase().includes(query) : false;
          
          if (!matchesTitle && !matchesDescription && !matchesLocation) {
            return false;
          }
        }
        
        return true;
      })
      .map(event => {
        // Parse dates
        const startDate = parseISO(event.start_date);
        let endDate = event.end_date ? parseISO(event.end_date) : new Date(startDate);
        
        // If it's an all-day event and no end date, set end to same as start
        if (event.all_day && !event.end_date) {
          endDate = new Date(startDate);
        }
        
        // If it's not an all-day event, add time
        if (!event.all_day && event.start_time) {
          const [startHours, startMinutes] = event.start_time.split(':').map(Number);
          startDate.setHours(startHours, startMinutes);
          
          if (event.end_time) {
            const [endHours, endMinutes] = event.end_time.split(':').map(Number);
            endDate.setHours(endHours, endMinutes);
          } else {
            // Default to 1 hour duration if no end time
            endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 1);
          }
        } else if (event.all_day) {
          // For all-day events, set to midnight and end to midnight of the next day
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
        }
        
        // Ensure dates are valid
        if (!isValid(startDate)) {
          console.error('Invalid start date for event:', event);
          return null;
        }
        
        return {
          id: event.id,
          title: event.title,
          start: startDate,
          end: endDate,
          allDay: event.all_day,
          color: event.color || '#4f46e5' // Default color for project events
        };
      })
      .filter(Boolean) as CalendarEvent[];
  }, [events, searchQuery, localizer]);

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/events/${event.id}`);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    // Format the date for the URL
    const formattedDate = format(start, 'yyyy-MM-dd');
    navigate(`/events/new?date=${formattedDate}&project_id=${projectId}`);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '4px',
        opacity: 0.9,
        color: '#fff',
        border: '0',
        display: 'block',
        padding: '2px 5px'
      }
    };
  };

  const CustomToolbar = ({ label, onNavigate, onView }: any) => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onNavigate('TODAY')}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onNavigate('PREV')}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border-t border-b border-l border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('NEXT')}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 ml-4">{label}</h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onView('month')}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              view === 'month' 
                ? 'bg-purple-600 dark:bg-purple-700 text-white' 
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            } transition-colors`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => onView('week')}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              view === 'week' 
                ? 'bg-purple-600 dark:bg-purple-700 text-white' 
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            } transition-colors`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onView('day')}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              view === 'day' 
                ? 'bg-purple-600 dark:bg-purple-700 text-white' 
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            } transition-colors`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onView('agenda')}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              view === 'agenda' 
                ? 'bg-purple-600 dark:bg-purple-700 text-white' 
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            } transition-colors`}
          >
            Agenda
          </button>
        </div>
      </div>
    );
  };

  if (loading || !localizer) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500 dark:text-purple-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error || 'Project not found'}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/projects')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Return to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <div className="mb-6">
        <Link 
          to={`/projects/${projectId}`}
          className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Project
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
            {project.title}: Calendar
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search events..."
                className="pl-10 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <Link
              to={`/events/new?project_id=${projectId}`}
              className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white px-5 py-2.5 rounded-lg hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-500 transition-all duration-200 shadow-sm font-medium"
            >
              <Plus className="h-5 w-5 mr-1.5" />
              New Event
            </Link>
          </div>
        </div>
      </div>

      {/* Calendar */}
      {localizer && (
        <div className="calendar-container">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 700 }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day', 'agenda']}
            view={view}
            onView={(newView: any) => setView(newView)}
            date={date}
            onNavigate={(newDate: Date) => setDate(newDate)}
            components={{
              toolbar: CustomToolbar
            }}
            popup
          />
        </div>
      )}

      {events.length === 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-700/30 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700 border-dashed">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No events scheduled</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Start planning your project timeline by adding events</p>
          <Link
            to={`/events/new?project_id=${projectId}`}
            className="inline-flex items-center px-5 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shadow-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Schedule First Event
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProjectEventsView;