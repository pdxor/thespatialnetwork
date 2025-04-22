import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { generateWithOpenAI } from '../../lib/openai';
import { Mic, MicOff, Upload, Send, Loader2, X, FileUp, MessageSquare, Sparkles, Info } from 'lucide-react';
import { BusinessPlanTemplate } from './BusinessPlanGenerator';

interface BusinessPlanChatProps {
  projectId: string;
  currentPlan: string | null;
  onUpdatePlan: (newContent: string) => Promise<void>;
  activeSection: string | null;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const BusinessPlanChat: React.FC<BusinessPlanChatProps> = ({
  projectId,
  currentPlan,
  onUpdatePlan,
  activeSection,
  onClose
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [businessPlanTemplate, setBusinessPlanTemplate] = useState<BusinessPlanTemplate | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [projectDetails, setProjectDetails] = useState<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      recognitionRef.current = new window.SpeechRecognition();
    }

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
        
        if (event.results[current].isFinal) {
          setMessage(prev => prev + ' ' + transcript);
          recognition.stop();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Fetch project details
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!projectId) return;
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (error) throw error;
        setProjectDetails(data);
      } catch (err) {
        console.error('Error fetching project details:', err);
      }
    };
    
    fetchProjectDetails();
  }, [projectId]);

  // Parse current plan into template
  useEffect(() => {
    if (currentPlan) {
      try {
        const parsed = JSON.parse(currentPlan) as BusinessPlanTemplate;
        setBusinessPlanTemplate(parsed);
        
        // Add initial system message based on active section
        const initialMessages: ChatMessage[] = [
          {
            role: 'system',
            content: 'I am your business plan assistant. I will help you develop your permaculture business plan through conversation.'
          }
        ];
        
        if (activeSection) {
          initialMessages.push({
            role: 'assistant',
            content: `I see you want to work on the ${formatSectionTitle(activeSection)} section of your business plan. What specific aspects would you like to develop or improve?`
          });
        } else {
          initialMessages.push({
            role: 'assistant',
            content: 'Welcome to the Business Plan Assistant! I can help you develop your permaculture business plan through conversation. What section would you like to work on today?'
          });
        }
        
        setChatHistory(initialMessages);
      } catch (e) {
        // If parsing fails, it's the old format
        setChatHistory([
          {
            role: 'system',
            content: 'I am your business plan assistant. I will help you develop your permaculture business plan through conversation.'
          },
          {
            role: 'assistant',
            content: 'Welcome to the Business Plan Assistant! I can help you develop your permaculture business plan through conversation. What would you like to work on today?'
          }
        ]);
      }
    } else {
      // No existing plan, start fresh
      setChatHistory([
        {
          role: 'system',
          content: 'I am your business plan assistant. I will help you develop your permaculture business plan through conversation.'
        },
        {
          role: 'assistant',
          content: 'Welcome to the Business Plan Assistant! I can help you develop your permaculture business plan through conversation. What would you like to work on today?'
        }
      ]);
    }
  }, [currentPlan, activeSection]);

  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setProcessing(true);
    setError(null);

    try {
      // Read file content
      const text = await readFileAsText(file);
      
      // Add user message about the uploaded document
      const userMessage = `I'm uploading a document titled "${file.name}" for analysis. Here's the content: ${text.substring(0, 150)}...`;
      setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
      
      // Generate prompt for processing the document
      const prompt = `I have uploaded a document that may contain information relevant to a business plan for my permaculture project. 
        Please analyze this content and extract any relevant information that could be used in my business plan:

        ${text}

        Please identify which sections of the business plan this information would be most relevant for, and suggest how to integrate it.`;

      // Add loading message
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Analyzing your document...' }]);

      const response = await generateWithOpenAI({
        userId: user.id,
        prompt,
        fieldName: 'businessPlan',
        maxTokens: 2000
      });

      // Update chat history with AI response
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { role: 'assistant', content: response };
        return newHistory;
      });

    } catch (err) {
      console.error('Error processing document:', err);
      setError('Failed to process document. Please try again.');
      
      // Add error message to chat
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error while processing your document. Please try again or upload a different file.' 
      }]);
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  };

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;

    setProcessing(true);
    setError(null);

    try {
      // Add user message to chat history
      const userMessage = message;
      setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
      setMessage('');
      setTranscript('');
      
      // Add loading message
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Thinking...' }]);

      // Generate prompt based on current section or general input
      let prompt = '';
      
      if (activeSection && businessPlanTemplate) {
        prompt = `I'm working on the ${formatSectionTitle(activeSection)} section of my permaculture business plan. Here is my input: ${userMessage}

        Current content for this section:
        ${JSON.stringify(businessPlanTemplate[activeSection as keyof BusinessPlanTemplate], null, 2)}
        
        Project details:
        Title: ${projectDetails?.title || 'Not specified'}
        Location: ${projectDetails?.location || 'Not specified'}
        Property Status: ${projectDetails?.property_status === 'owned_land' ? 'Owned Land' : 'Potential Property'}
        Values, Mission & Goals: ${projectDetails?.values_mission_goals || 'Not specified'}
        
        Please provide a helpful response that helps me improve this section. If appropriate, suggest specific content that could be added to the business plan.`;
      } else {
        // Include chat history for context
        const contextHistory = chatHistory
          .filter(msg => msg.role !== 'system')
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
        
        prompt = `I'm working on my permaculture business plan for a project called "${projectDetails?.title || projectId}". Here is our conversation so far:

        ${contextHistory}
        
        User: ${userMessage}
        
        Project details:
        Title: ${projectDetails?.title || 'Not specified'}
        Location: ${projectDetails?.location || 'Not specified'}
        Property Status: ${projectDetails?.property_status === 'owned_land' ? 'Owned Land' : 'Potential Property'}
        Values, Mission & Goals: ${projectDetails?.values_mission_goals || 'Not specified'}
        
        Please provide a helpful response that helps me develop my business plan. If appropriate, suggest specific content that could be added.`;
      }

      const response = await generateWithOpenAI({
        userId: user.id,
        prompt,
        fieldName: 'businessPlan',
        maxTokens: 1500
      });

      // Update chat history with AI response
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1] = { role: 'assistant', content: response };
        return newHistory;
      });

      // Check if the response contains content that should be added to the business plan
      if (response.includes("I suggest adding this to your business plan:") || 
          response.includes("Here's content you can add to your business plan:") ||
          response.includes("You could add the following to your business plan:")) {
        
        // Extract the suggested content
        const contentMatch = response.match(/```([\s\S]*?)```/);
        if (contentMatch && contentMatch[1]) {
          const suggestedContent = contentMatch[1].trim();
          
          // If we have a template and active section, update that section
          if (businessPlanTemplate && activeSection) {
            const updatedTemplate = { ...businessPlanTemplate };
            const section = updatedTemplate[activeSection as keyof BusinessPlanTemplate];
            
            // Update the appropriate field based on the section type
            if (typeof section === 'object') {
              // Find the first empty field or append to an existing one
              const keys = Object.keys(section).filter(k => k !== 'completed');
              const targetKey = keys.find(k => !section[k as keyof typeof section]) || keys[0];
              
              if (targetKey) {
                // Handle arrays vs strings
                if (Array.isArray(section[targetKey as keyof typeof section])) {
                  (section[targetKey as keyof typeof section] as any).push(suggestedContent);
                } else {
                  const currentContent = section[targetKey as keyof typeof section] as string;
                  section[targetKey as keyof typeof section] = currentContent 
                    ? `${currentContent}\n\n${suggestedContent}` 
                    : suggestedContent;
                }
                
                // Mark as completed if it has content
                section.completed = true;
                
                // Update the template and save
                await onUpdatePlan(JSON.stringify(updatedTemplate, null, 2));
              }
            }
          } else if (currentPlan) {
            // If no template or active section, just append to the current plan
            await onUpdatePlan(`${currentPlan}\n\n${suggestedContent}`);
          } else {
            // If no current plan, create a new one
            await onUpdatePlan(suggestedContent);
          }
        }
      }

    } catch (err) {
      console.error('Error updating business plan:', err);
      setError('Failed to update business plan. Please try again.');
      
      // Update chat history with error message
      setChatHistory(prev => {
        const newHistory = [...prev];
        if (newHistory[newHistory.length - 1].content === 'Thinking...') {
          newHistory[newHistory.length - 1] = { 
            role: 'assistant', 
            content: 'I encountered an error while processing your request. Please try again.' 
          };
        } else {
          newHistory.push({ 
            role: 'assistant', 
            content: 'I encountered an error while processing your request. Please try again.' 
          });
        }
        return newHistory;
      });
    } finally {
      setProcessing(false);
    }
  };

  // Format section title for display
  const formatSectionTitle = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  };

  // Get suggestions based on active section
  const getSuggestions = () => {
    if (!activeSection) return [];
    
    switch (activeSection) {
      case 'executiveSummary':
        return [
          "What's the core mission of your permaculture project?",
          "What are your key objectives for the next 1-3 years?",
          "How would you describe your project's vision in one sentence?"
        ];
      case 'projectDescription':
        return [
          "What permaculture principles are most important to your project?",
          "What makes your site unique or special?",
          "How will you implement zone design in your project?"
        ];
      case 'marketAnalysis':
        return [
          "Who is your target market or community?",
          "What trends are you seeing in sustainable agriculture?",
          "Who are your main competitors and what makes you different?"
        ];
      case 'financialPlan':
        return [
          "What are your main startup costs?",
          "What are your expected revenue streams?",
          "How much funding do you need and what will it be used for?"
        ];
      default:
        return [
          "Tell me more about your permaculture project",
          "What aspects of your business plan need the most help?",
          "What's your timeline for implementing this project?"
        ];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
            Business Plan Assistant
            {activeSection && (
              <span className="ml-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                {formatSectionTitle(activeSection)}
              </span>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Chat history */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
        >
          {chatHistory.filter(msg => msg.role !== 'system').map((msg, index) => (
            <div 
              key={index} 
              className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div 
                className={`inline-block max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                }`}
              >
                {msg.content === 'Thinking...' ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Thinking...
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {showSuggestions && getSuggestions().length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Sparkles className="h-4 w-4 mr-1 text-purple-500 dark:text-purple-400" />
                Suggested Questions
              </h3>
              <button 
                onClick={() => setShowSuggestions(false)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Hide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {getSuggestions().map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMessage(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm px-3 py-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-800/30 border border-purple-200 dark:border-purple-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Voice and file upload controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={toggleVoiceInput}
            className={`p-2 rounded-full ${
              isListening ? 'bg-red-600 dark:bg-red-700' : 'bg-blue-600 dark:bg-blue-700'
            } text-white hover:opacity-90 transition-colors`}
            title={isListening ? 'Stop recording' : 'Start recording'}
          >
            {isListening ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.doc,.docx,.pdf,.md"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              title="Upload document"
            >
              <FileUp className="h-5 w-5" />
            </button>
          </div>
          
          <div className="relative ml-auto">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title="Show suggestions"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </div>

        {transcript && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300">{transcript}</p>
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type or speak to add content to your business plan..."
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 resize-none dark:bg-gray-700 dark:text-gray-100"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || processing}
            className="px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-orange-300 dark:disabled:bg-orange-800 disabled:cursor-not-allowed flex items-center self-end"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessPlanChat;