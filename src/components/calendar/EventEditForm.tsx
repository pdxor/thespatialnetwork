import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
type Event = Database['public']['Tables']['events']['Row'];

interface Member {
  id: string;
  name: string;
  email: string;
}

const EventEditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [eventLocation, setEventLocation] = useState('');
  const [isProjectEvent, setIsProjectEvent] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [attendees, setAttendees] = useState<Member[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [color, setColor] = useState('#4f46e5'); // Default color (indigo)
  const [recurring, setRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // Fetch event data
  useEffect(() => {
    if (!id || !user) return;
    
    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (!data) {
          setError('Event not found');
          return;
        }
        
        // Set form values from event data
        setTitle(data.title);
        setDescription(data.description || '');
        setStartDate(new Date(data.start_date));
        setEndDate(data.end_date ? new Date(data.end_date) : null);
        setStartTime(data.start_time || '');
        setEndTime(data.end_time || '');
        setAllDay(data.all_day);
        setEventLocation(data.location || '');
        setIsProjectEvent(data.is_project_event);
        setProjectId(data.project_id || '');
        setColor(data.color || '#4f46e5');
        setRecurring(data.recurring || false);
        setRecurringPattern(data.recurring_pattern || 'weekly');
        setRecurringEndDate(data.recurring_end_date ? new Date(data.recurring_end_date) : null);
        
        // Fetch attendees
        if (data.attendees && data.attendees.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .in('user_id', data.attendees);
            
          if (!profilesError && profiles) {
            const memberList: Member[] = profiles.map(profile => ({
              id: profile.user_id,
              name: profile.name || 'Team Member',
              email: profile.email || ''
            }));
            setAttendees(memberList);
          }
        }
        
        // If event is associated with a project, fetch project details
        if (data.project_id) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', data.project_id)
            .single();
            
          if (!projectError && projectData) {
            setProjectDetails(projectData);
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the event');
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch user's projects
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .or(`created_by.eq.${user.id},team.cs.{${user.id}}`)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        setProjects(data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    
    fetchEvent();
    fetchProjects();
  }, [id, user]);
  
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
    if (!user || !id || !startDate) return;
    
    setSaving(true);
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
        is_project_event: isProjectEvent,
        project_id: isProjectEvent && projectId ? projectId : null,
        attendees: attendees.map(a => a.id),
        color,
        recurring,
        recurring_pattern: recurring ? recurringPattern : null,
        recurring_end_date: recurring ? formattedRecurringEndDate : null,
        updated_at: new Date().toISOString()
      };
      
      // Update event in database
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess('Event updated successfully!');
      
      // Navigate to appropriate page after success
      setTimeout(() => {
        if (isProjectEvent && projectId) {
          navigate(`/projects/${projectId}/calendar`);
        } else {
          navigate('/calendar');
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error updating event:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while updating the event');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-400"></div>
      </div>
    );
  }

  if (error && !title) {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Back link to project if event is associated with a project */}
      {projectDetails && (
        <div className="mb-6">
          <Link 
            to={`/projects/${projectDetails.id}`}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {projectDetails.title}
          </Link>
        </div>
      )}
      
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <Calendar className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
        Edit Calendar Item
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
          <div className="flex items-center mb-2">
            <input
              id="isProjectEvent"
              type="checkbox"
              className="h-4 w-4 text-purple-500 dark:text-purple-400 focus:ring-purple-400 dark:focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded"
              checked={isProjectEvent}
              onChange={(e) => {
                setIsProjectEvent(e.target.checked);
                if (!e.target.checked) {
                  setProjectId('');
                }
              }}
            />
            <label className="ml-2 block text-gray-700 dark:text-gray-200 text-sm font-medium" htmlFor="isProjectEvent">
              Associate with a project
            </label>
          </div>
          
          {isProjectEvent && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-200 dark:border-gray-700">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="projectId">
                Project *
              </label>
              <div className="relative">
                <Folder className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <select
                  id="projectId"
                  className="w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-100 appearance-none"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    const selectedProject = projects.find(p => p.id === e.target.value);
                    setProjectDetails(selectedProject || null);
                  }}
                  required={isProjectEvent}
                >
                  <option value="">Select a project</option>
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
            disabled={saving}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
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

export default EventEditForm;