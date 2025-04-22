import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Loader2, X, FileText, MessageSquare, Sparkles, Info, Wand2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface UniversalVoiceInputProps {
  onClose?: () => void;
  currentProject?: { id: string; title: string } | null;
}

const UniversalVoiceInput: React.FC<UniversalVoiceInputProps> = ({ 
  onClose,
  currentProject 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      recognitionRef.current = new window.SpeechRecognition();
    } else {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscript(transcript);
      
      if (event.results[current].isFinal) {
        recognition.stop();
        handleSubmit(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError('Error with speech recognition. Please try again.');
      setIsListening(false);
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const parseVoiceInput = async (input: string) => {
    const lowerInput = input.toLowerCase();
    
    // Extract key information using regex patterns
    const titleMatch = input.match(/(?:called|named|titled)\s+["']?([^"'.,]+)["']?/i) || 
                      input.match(/(?:add|create|make|set up)\s+(?:a|an)?\s*(?:task|todo|project|item)?\s*(?:called|named|titled)?\s+["']?([^"'.,]+)["']?/i);
    
    const title = titleMatch ? titleMatch[1].trim() : input.trim();
    
    // Task detection with improved patterns
    const taskPatterns = [
      /\b(?:task|todo|to do|to-do|remind me to|need to)\b/i,
      /\b(?:by|before|due|deadline)\b.*\b(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|next month)\b/i,
      /\b(?:finish|complete|do|work on)\b/i,
      /\b(?:high priority|urgent|important)\b/i
    ];
    
    const isTask = taskPatterns.some(pattern => pattern.test(lowerInput));
    
    // Inventory item detection with improved patterns
    const inventoryPatterns = [
      /\b(?:need|buy|purchase|get|acquire|order|item|supply|resource|inventory)\b/i,
      /\b(?:quantity|units|pieces|kg|pounds|liters|gallons)\b/i,
      /\b(?:costs?|price|worth|value|dollars|euros)\b/i,
      /\b(?:owned|borrowed|rental|equipment|tool|material)\b/i
    ];
    
    const isInventory = inventoryPatterns.some(pattern => pattern.test(lowerInput));
    
    // Project detection
    const projectPatterns = [
      /\b(?:project|initiative|plan|property|land|site|location)\b/i,
      /\b(?:create project|new project|start project)\b/i,
      /\b(?:permaculture design|zone|guild|water system|soil)\b/i,
      /\b(?:owned land|potential property)\b/i
    ];
    
    const isProject = projectPatterns.some(pattern => pattern.test(lowerInput)) && !currentProject;
    
    // Business plan detection
    const businessPlanPatterns = [
      /\b(?:business plan|executive summary|market analysis|financial plan|marketing strategy)\b/i,
      /\b(?:operations|management|timeline|risk analysis|sustainability)\b/i
    ];
    
    const isBusinessPlan = businessPlanPatterns.some(pattern => pattern.test(lowerInput)) && currentProject;
    
    // Extract priority for tasks
    let priority = 'medium';
    if (/\b(?:urgent|emergency|asap|immediately|critical)\b/i.test(lowerInput)) {
      priority = 'urgent';
    } else if (/\b(?:high|important|priority)\b/i.test(lowerInput)) {
      priority = 'high';
    } else if (/\b(?:low|whenever|not urgent|not important|can wait)\b/i.test(lowerInput)) {
      priority = 'low';
    }
    
    // Extract status for tasks
    let status = 'todo';
    if (/\b(?:in progress|started|working on|begun)\b/i.test(lowerInput)) {
      status = 'in_progress';
    } else if (/\b(?:done|completed|finished|ready)\b/i.test(lowerInput)) {
      status = 'done';
    } else if (/\b(?:blocked|stuck|waiting|on hold|paused)\b/i.test(lowerInput)) {
      status = 'blocked';
    }
    
    // Extract due date for tasks
    let dueDate = null;
    const datePatterns = [
      { regex: /\b(?:today)\b/i, days: 0 },
      { regex: /\b(?:tomorrow)\b/i, days: 1 },
      { regex: /\b(?:next week|in a week)\b/i, days: 7 },
      { regex: /\b(?:next month|in a month)\b/i, days: 30 },
      { regex: /\bin\s+(\d+)\s+days?\b/i, custom: true },
      { regex: /\bin\s+(\d+)\s+weeks?\b/i, custom: true, multiplier: 7 },
      { regex: /\bin\s+(\d+)\s+months?\b/i, custom: true, multiplier: 30 }
    ];
    
    for (const pattern of datePatterns) {
      const match = lowerInput.match(pattern.regex);
      if (match) {
        const now = new Date();
        if (pattern.custom && match[1]) {
          const value = parseInt(match[1]);
          const multiplier = pattern.multiplier || 1;
          now.setDate(now.getDate() + (value * multiplier));
        } else {
          now.setDate(now.getDate() + (pattern.days || 0));
        }
        dueDate = now.toISOString();
        break;
      }
    }
    
    // Check for specific day of week
    const dayOfWeekMatch = lowerInput.match(/\b(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (dayOfWeekMatch) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(dayOfWeekMatch[1].toLowerCase());
      if (targetDay !== -1) {
        const now = new Date();
        const currentDay = now.getDay();
        let daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // Next week same day
        if (dayOfWeekMatch[0].toLowerCase().startsWith('this') && daysToAdd === 7) {
          daysToAdd = 0; // This week same day
        }
        now.setDate(now.getDate() + daysToAdd);
        dueDate = now.toISOString();
      }
    }
    
    // Extract quantity for inventory items
    let quantity = 1;
    const quantityMatch = lowerInput.match(/\b(\d+)\s+(?:units?|pieces?|items?|kg|pounds?|liters?|gallons?)\b/i) || 
                          lowerInput.match(/\b(?:quantity|qty)(?:\s+of)?\s+(\d+)\b/i) ||
                          lowerInput.match(/\bneed\s+(\d+)\b/i);
    
    if (quantityMatch && quantityMatch[1]) {
      quantity = parseInt(quantityMatch[1]);
    }
    
    // Extract price for inventory items
    let price = null;
    const priceMatch = lowerInput.match(/\$(\d+(?:\.\d+)?)\b/i) || 
                      lowerInput.match(/\b(\d+(?:\.\d+)?)\s+(?:dollars|usd|euros|pounds)\b/i) ||
                      lowerInput.match(/\b(?:costs?|price|worth|value)(?:\s+of)?\s+(\d+(?:\.\d+)?)\b/i);
    
    if (priceMatch && priceMatch[1]) {
      price = parseFloat(priceMatch[1]);
    }
    
    // Extract item type for inventory
    let itemType = 'needed_supply';
    if (/\b(?:owned|have|possess|acquired|bought|purchased)\b/i.test(lowerInput)) {
      itemType = 'owned_resource';
    } else if (/\b(?:borrowed|rented|rental|temporary|loan)\b/i.test(lowerInput)) {
      itemType = 'borrowed_or_rental';
    }
    
    // Extract property status for projects
    let propertyStatus = 'potential_property';
    if (/\b(?:owned land|my land|our land|my property|our property|already own|already have)\b/i.test(lowerInput)) {
      propertyStatus = 'owned_land';
    }
    
    // Extract location for projects
    let location = null;
    const locationMatch = lowerInput.match(/\b(?:in|at|located in|based in|near)\s+([a-z\s,]+)(?:\.|\s|$)/i);
    if (locationMatch && locationMatch[1]) {
      location = locationMatch[1].trim();
    }
    
    // Extract tags for inventory items
    let tags: string[] = [];
    const tagsMatch = lowerInput.match(/\b(?:tags?|categories?|labeled as)(?:\s+with)?\s+([a-z\s,]+)(?:\.|\s|$)/i);
    if (tagsMatch && tagsMatch[1]) {
      tags = tagsMatch[1].split(/,|\sand\s/).map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    
    // Extract description
    let description = null;
    const descriptionMatch = lowerInput.match(/\b(?:described as|description is|details are)\s+([^.]+)(?:\.|\s|$)/i);
    if (descriptionMatch && descriptionMatch[1]) {
      description = descriptionMatch[1].trim();
    }
    
    // NEW: Extract project reference for tasks and inventory items
    let projectId = currentProject?.id || null;
    let projectTitle = currentProject?.title || null;
    
    // Look for project mentions in the input if not already in a project context
    if (!currentProject) {
      // Pattern to match "for project X" or "in project X" or "to project X"
      const projectMentionMatch = lowerInput.match(/\b(?:for|in|to|with|under|related to|associated with)\s+(?:the\s+)?(?:project|initiative)?\s+["']?([^"'.,]+)["']?/i);
      
      if (projectMentionMatch && projectMentionMatch[1]) {
        const mentionedProjectName = projectMentionMatch[1].trim();
        
        // Search for the project in the database
        try {
          const { data: projectData, error } = await supabase
            .from('projects')
            .select('id, title')
            .or(`title.ilike.%${mentionedProjectName}%, title.eq.${mentionedProjectName}`)
            .limit(1);
            
          if (!error && projectData && projectData.length > 0) {
            projectId = projectData[0].id;
            projectTitle = projectData[0].title;
            console.log(`Found project: ${projectTitle} (${projectId})`);
          }
        } catch (err) {
          console.error('Error searching for project:', err);
        }
      }
    }
    
    // Determine the type of entity to create based on patterns and context
    if (isBusinessPlan && (currentProject || projectId)) {
      return {
        type: 'businessPlan',
        data: {
          projectId: currentProject?.id || projectId,
          query: input
        }
      };
    } else if (isTask || (!isInventory && !isProject)) {
      // Default to task if no clear type is detected
      return {
        type: 'task',
        data: {
          title: title,
          description: description,
          status: status,
          priority: priority,
          due_date: dueDate,
          is_project_task: (currentProject || projectId) ? true : false,
          project_id: currentProject?.id || projectId,
          created_by: user?.id,
          assignees: [user?.id]
        }
      };
    } else if (isInventory) {
      return {
        type: 'inventory',
        data: {
          title: title,
          description: description,
          item_type: itemType,
          fundraiser: /\b(?:fundraiser|fundraising|fund raising|need funding|raise money)\b/i.test(lowerInput),
          tags: tags.length > 0 ? tags : null,
          quantity_needed: itemType === 'needed_supply' ? quantity : null,
          quantity_owned: itemType === 'owned_resource' ? quantity : null,
          quantity_borrowed: itemType === 'borrowed_or_rental' ? quantity : null,
          price: price,
          estimated_price: price !== null ? true : null,
          price_currency: 'USD',
          price_date: price !== null ? new Date().toISOString() : null,
          price_source: 'Voice Input',
          added_by: user?.id,
          project_id: currentProject?.id || projectId,
          assignees: [user?.id]
        }
      };
    } else if (isProject) {
      return {
        type: 'project',
        data: {
          title: title,
          location: location,
          property_status: propertyStatus,
          values_mission_goals: description,
          created_by: user?.id
        }
      };
    }
    
    // Default to task if no clear type is detected
    return {
      type: 'task',
      data: {
        title: title,
        description: null,
        status: 'todo',
        priority: 'medium',
        due_date: null,
        is_project_task: (currentProject || projectId) ? true : false,
        project_id: currentProject?.id || projectId,
        created_by: user?.id,
        assignees: [user?.id]
      }
    };
  };

  const handleSubmit = async (finalTranscript?: string) => {
    const inputText = finalTranscript || transcript;
    if (!inputText || !user) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      const parsed = await parseVoiceInput(inputText);
      console.log('Parsed voice input:', parsed);
      
      switch (parsed.type) {
        case 'task': {
          console.log('Creating task with data:', parsed.data);
          const { data, error } = await supabase
            .from('tasks')
            .insert(parsed.data)
            .select('id')
            .single();
            
          if (error) throw error;
          
          // If it's a project task, navigate to project tasks view
          if (parsed.data.project_id) {
            navigate(`/projects/${parsed.data.project_id}/tasks`);
          } else {
            navigate(`/tasks/${data.id}`);
          }
          break;
        }
        
        case 'inventory': {
          const { data, error } = await supabase
            .from('items')
            .insert(parsed.data)
            .select('id')
            .single();
            
          if (error) throw error;
          
          // If it's a project item, navigate to project inventory
          if (parsed.data.project_id) {
            navigate(`/projects/${parsed.data.project_id}/inventory`);
          } else {
            navigate(`/inventory/${data.id}`);
          }
          break;
        }
        
        case 'project': {
          const { data, error } = await supabase
            .from('projects')
            .insert(parsed.data)
            .select('id')
            .single();
            
          if (error) throw error;
          navigate(`/projects/${data.id}`);
          break;
        }
        
        case 'businessPlan': {
          navigate(`/projects/${parsed.data.projectId}`);
          break;
        }
      }
      
      if (onClose) onClose();
      
    } catch (err) {
      console.error('Error processing voice input:', err);
      setError('Failed to process voice input. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    if (!isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('Error starting voice recognition. Please try again.');
      }
    } else {
      recognitionRef.current.stop();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 w-full transform transition-all duration-300 ease-in-out">
        <div className="text-center mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
              <Wand2 className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
              Voice Assistant
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {currentProject && (
            <div className="inline-flex items-center gap-2 text-green-600 dark:text-cyan-400 mb-2 bg-green-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-full">
              <FileText className="h-4 w-4" />
              <p className="text-sm font-medium">Adding to: {currentProject.title}</p>
            </div>
          )}
          
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Speak to add a task, inventory item, project, or work on your business plan. Include keywords like "task", "need", "project", or "business plan" to specify the type.
            {currentProject ? " Items will be associated with the current project." : ""}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6">
          <div className="flex justify-center mb-6">
            <button
              onClick={toggleListening}
              disabled={processing}
              className={`p-6 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 ${
                isListening 
                  ? 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 animate-pulse' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 hover:from-purple-700 hover:to-indigo-700 dark:hover:from-purple-600 dark:hover:to-indigo-600'
              } text-white`}
            >
              {processing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : isListening ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-lg min-h-[120px] border border-gray-200 dark:border-gray-700 shadow-inner">
            {transcript ? (
              <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                {transcript}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <Sparkles className="h-6 w-6 mb-2 text-purple-400 dark:text-purple-500" />
                <p>Start speaking...</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 font-medium flex-1"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={!transcript || processing}
            className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-500 dark:from-teal-700 dark:to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-green-600 dark:hover:from-teal-600 dark:hover:to-teal-500 disabled:from-gray-400 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-600 disabled:text-gray-200 dark:disabled:text-gray-400 transition-all duration-200 font-medium flex-1 shadow-sm"
          >
            {processing ? 'Processing...' : 'Submit'}
          </button>
        </div>
        
        <div className="mt-4 flex justify-center">
          <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            Voice commands help
          </button>
        </div>
      </div>
    </div>
  );
};

export default UniversalVoiceInput;