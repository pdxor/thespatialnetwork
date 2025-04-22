import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Filter, Calendar as CalendarIcon, Search, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Database } from '../../types/supabase';
import './calendar-styles.css';

type Event = Database['public']['Tables']['events']['Row'];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource?: any;
  color?: string;
  project_id?: string | null;
  project_title?: string;
}

const EventsCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'project'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [projects, setProjects] = useState<{id: string, title: string}[]>([]);
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
    if (!user) return;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        // Fetch events where the user is either the creator or an attendee
        const { data, error } = await supabase
          .from('events')
          .select('*, projects(title)')
          .order('start_date', { ascending: true });

        if (error) {
          console.error('Error fetching events:', error);
          setError('Could not load events');
        } else {
          setEvents(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title')
          .or(`created_by.eq.${user.id},team.cs.{${user.id}}`);
          
        if (error) throw error;
        
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };

    fetchEvents();
    fetchProjects();
  }, [user]);

  // Convert events to calendar format
  const calendarEvents = React.useMemo(() => {
    if (!events.length) return [];
    
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
        
        // Apply type filter
        if (filterType === 'personal' && event.is_project_event) {
          return false;
        }
        if (filterType === 'project' && !event.is_project_event) {
          return false;
        }
        
        // Apply project filter
        if (filterProject !== 'all' && event.project_id !== filterProject) {
          return false;
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
          color: event.color || (event.is_project_event ? '#4f46e5' : '#10b981'), // Default colors for project vs personal
          project_id: event.project_id,
          project_title: event.projects?.title
        };
      })
      .filter(Boolean) as CalendarEvent[];
  }, [events, searchQuery, filterType, filterProject]);

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/events/${event.id}`);
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    // Format the date for the URL
    const formattedDate = format(start, 'yyyy-MM-dd');
    navigate(`/events/new?date=${formattedDate}`);
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

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <CalendarIcon className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
          Calendar
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
          
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              className="pl-10 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 shadow-sm appearance-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">All Events</option>
              <option value="personal">Personal Events</option>
              <option value="project">Project Events</option>
            </select>
            <div className="absolute right-3 top-3 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {filterType === 'project' && (
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                className="pl-10 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 shadow-sm appearance-none"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          
          <Link
            to="/events/new"
            className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white px-5 py-2.5 rounded-lg hover:from-purple-700 hover:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-500 transition-all duration-200 shadow-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-1.5" />
            New Event
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
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
      </div>
    </div>
  );
};

export default EventsCalendar;