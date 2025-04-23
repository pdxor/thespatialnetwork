import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/supabase';
import { Calendar, Clock, MapPin, Folder, Save, ArrowLeft, Users, UserPlus, Repeat, Palette } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import MemberSearch from '../common/MemberSearch';
import MemberList from '../common/MemberList';
import '../events/datepicker-styles.css';

type Project = Database['public']['Tables']['projects']['Row'];

interface Member {
  id: string;
  name: string;
  email: string;
}

const EventCreateForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get project_id and date from query params if present
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromQuery = queryParams.get('project_id');
  const dateFromQuery = queryParams.get('date');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(dateFromQuery ? new Date(dateFromQuery) : new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [eventLocation, setEventLocation] = useState('');
  const [projectId, setProjectId] = useState(projectIdFromQuery || '');
  const [attendees, setAttendees] = useState<Member[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [color, setColor] = useState('#4f46e5'); // Default color (indigo)
  const [recurring, setRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<Project | null>(null);
  
  // Predefined color options
  const colorOptions = [
    { value: '#4f46e5', label: 'Indigo' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#8b5cf6', label: 'Violet' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#6366f1', label: 'Blue' },
  ];
  
  // Fetch user's projects
  useEffect(() => {
    if (!user) return;
    
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .or(`created_by.eq.${user.id},team.cs.{${user.id}}`)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setProjects(data || []);
        
        // If project ID was passed via query params, fetch project details
        if (projectIdFromQuery) {
          const project = data?.find(p => p.id === projectIdFromQuery);
          if (project) {
            setProjectDetails(project);
          }
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    
    fetchProjects();
  }, [user, projectIdFromQuery]);
  
  // Fetch current user's profile to add as default attendee
  useEffect(() => {
    if (!user) return;
    
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setAttendees([{
            id: user.id,
            name: data.name || 'Me',
            email: data.email || ''
          }]);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  const handleAddAttendee = (member: Member) => {
    if (!attendees.some(a => a.id === member.id)) {
      setAttendees([...attendees, member]);
    }
    setShowMemberSearch(false);
  };
  
  const handleRemoveAttendee = (id: string) => {
    setAttendees(attendees.filter(a => a.id !== id));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !startDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Format dates for database
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate ? endDate.toISOString().split('T')[0] : null;
      const formattedRecurringEndDate = recurringEndDate ? recurringEndDate.toISOString().split('T')[0] : null;
      
      // Event data
      const eventData = {
        title,
        description: description || null,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        all_day: allDay,
        location: eventLocation || null,
        is_project_event: !!projectId,
        project_id: projectId || null,
        created_by: user.id,
        attendees: attendees.map(a => a.id),
        color,
        recurring,
        recurring_pattern: recurring ? recurringPattern : null,
        recurring_end_date: recurring ? formattedRecurringEndDate : null
      };
      
      // Insert event into database
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select('id')
        .single();
        
      if (error) throw error;
      
      setSuccess('Event created successfully!');
      
      // Navigate to appropriate page after success
      setTimeout(() => {
        if (projectId) {
          navigate(`/projects/${projectId}/calendar`);
        } else {
          navigate('/calendar');
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error creating event:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while creating the event');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Back link to project if coming from a project page */}
      {projectIdFromQuery && projectDetails && (
        <div className="mb-6">
          <Link 
            to={`/projects/${projectIdFromQuery}`}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {projectDetails.title}
          </Link>
        </div>
      )}
      
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <Calendar className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
        Add to Calendar
        {projectDetails && (
          <span className="ml-2 text-lg text-gray-500 dark:text-gray-400">for {projectDetails.title}</span>
        )}
      </h1>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-600 text-green-700 dark:text-green-300 p-4 rounded-md mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="title">
            Title *
          </label>
          <input
            id="title"
            type="text"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
            rows={3}
          />
        </div>
        
        <div className="mb-4 flex items-center">
          <input
            id="allDay"
            type="checkbox"
            className="h-4 w-4 text-purple-500 dark:text-purple-400 focus:ring-purple-400 dark:focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          <label className="ml-2 block text-gray-700 dark:text-gray-200 text-sm font-medium" htmlFor="allDay">
            All-day event
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="startDate">
              Start Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <DatePicker
                id="startDate"
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
                dateFormat="MMMM d, yyyy"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="endDate">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <DatePicker
                id="endDate"
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
                dateFormat="MMMM d, yyyy"
                minDate={startDate}
                placeholderText="Same as start date"
              />
            </div>
          </div>
        </div>
        
        {!allDay && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="startTime">
                Start Time *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="startTime"
                  type="time"
                  className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required={!allDay}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="endTime">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  id="endTime"
                  type="time"
                  className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="location">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              id="location"
              type="text"
              className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder="Enter location (optional)"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="color">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(option => (
              <button
                key={option.value}
                type="button"
                className={`w-8 h-8 rounded-full border-2 ${color === option.value ? 'border-gray-800 dark:border-white' : 'border-transparent'}`}
                style={{ backgroundColor: option.value }}
                onClick={() => setColor(option.value)}
                title={option.label}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-full cursor-pointer"
              title="Custom color"
            />
          </div>
        </div>
        
        <div className="mb-4 flex items-center">
          <input
            id="recurring"
            type="checkbox"
            className="h-4 w-4 text-purple-500 dark:text-purple-400 focus:ring-purple-400 dark:focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <label className="ml-2 block text-gray-700 dark:text-gray-200 text-sm font-medium" htmlFor="recurring">
            Recurring event
          </label>
        </div>
        
        {recurring && (
          <div className="mb-6 pl-6 border-l-2 border-purple-200 dark:border-purple-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="recurringPattern">
                  Repeats
                </label>
                <div className="relative">
                  <Repeat className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <select
                    id="recurringPattern"
                    className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100 appearance-none"
                    value={recurringPattern}
                    onChange={(e) => setRecurringPattern(e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="recurringEndDate">
                  Ends On
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <DatePicker
                    id="recurringEndDate"
                    selected={recurringEndDate}
                    onChange={(date) => setRecurringEndDate(date)}
                    className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100"
                    dateFormat="MMMM d, yyyy"
                    minDate={startDate}
                    placeholderText="Never"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="projectId">
            Project
              </label>
              <div className="relative">
                <Folder className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <select
                  id="projectId"
                  className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100 appearance-none"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
              <option value="">No project (personal event)</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {projects.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  You don't have any projects yet. Create a project first to assign this event.
                </p>
              )}
              
              {projectId && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                  This event will be associated with the selected project.
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2 flex justify-between">
            <span>Attendees</span>
            {!showMemberSearch && (
              <button 
                type="button" 
                onClick={() => setShowMemberSearch(true)}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm flex items-center"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add Attendee
              </button>
            )}
          </label>
          
          {showMemberSearch ? (
            <div className="mb-4">
              <MemberSearch 
                onSelect={handleAddAttendee}
                excludeIds={attendees.map(a => a.id)}
                placeholder="Search by email address..."
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberSearch(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          
          <MemberList 
            members={attendees}
            onRemove={handleRemoveAttendee}
            onAdd={() => setShowMemberSearch(true)}
            emptyMessage="No attendees selected"
          />
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Attendees will receive notifications about this event.
          </p>
        </div>
        
        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-purple-600 dark:bg-purple-700 text-white py-2 px-6 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 flex items-center shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Add to Calendar
              </>
            )}
          </button>
          
          <button
            type="button"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventCreateForm;