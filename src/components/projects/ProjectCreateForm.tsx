import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Plus, Trash2, Save, X, Sparkles, Loader2, UserPlus, Image as ImageIcon, Upload, Globe } from 'lucide-react';
import AiAssistant from '../common/AiAssistant';
import MemberSearch from '../common/MemberSearch';
import MemberList from '../common/MemberList';
import { generateWithOpenAI } from '../../lib/openai';
import ProjectLocationMap from '../map/ProjectLocationMap';

interface Member {
  id: string;
  name: string;
  email: string;
}

const ProjectCreateForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [activeField, setActiveField] = useState<string>('');
  const [suggestAllLoading, setSuggestAllLoading] = useState(false);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  
  // Basic details
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [propertyStatus, setPropertyStatus] = useState<'owned_land' | 'potential_property'>('owned_land');
  const [valuesMissionGoals, setValuesMissionGoals] = useState('');
  const [category, setCategory] = useState('');
  const [fundingNeeds, setFundingNeeds] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Guilds
  const [newGuild, setNewGuild] = useState('');
  const [guilds, setGuilds] = useState<string[]>([]);
  
  // Team members
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  
  // Permaculture zones
  const [zone0, setZone0] = useState('');
  const [zone1, setZone1] = useState('');
  const [zone2, setZone2] = useState('');
  const [zone3, setZone3] = useState('');
  const [zone4, setZone4] = useState('');
  
  // Infrastructure
  const [water, setWater] = useState('');
  const [soil, setSoil] = useState('');
  const [power, setPower] = useState('');
  
  // Structures
  const [newStructure, setNewStructure] = useState('');
  const [structures, setStructures] = useState<string[]>([]);

  const [locationFromMap, setLocationFromMap] = useState<boolean>(false);
  const [mapLatitude, setMapLatitude] = useState<number | null>(null);
  const [mapLongitude, setMapLongitude] = useState<number | null>(null);

  // Fetch current user's profile to add as default team member
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
          setTeamMembers([{
            id: user.id,
            name: data.name || 'Me (Project Owner)',
            email: data.email || ''
          }]);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Location change effect
  useEffect(() => {
    // Only show suggestion buttons when location is provided
    if (location.trim()) {
      // Clean up any location suggestion indicators
      document.querySelectorAll('.location-suggestion-indicator').forEach(el => {
        el.classList.add('opacity-100');
      });
    }
  }, [location]);

  const handleAddGuild = () => {
    if (newGuild.trim() !== '' && !guilds.includes(newGuild.trim())) {
      setGuilds([...guilds, newGuild.trim()]);
      setNewGuild('');
    }
  };

  const handleRemoveGuild = (guildToRemove: string) => {
    setGuilds(guilds.filter(guild => guild !== guildToRemove));
  };

  const handleAddTeamMember = (member: Member) => {
    if (!teamMembers.some(m => m.id === member.id)) {
      setTeamMembers([...teamMembers, member]);
    }
    setShowMemberSearch(false);
  };

  const handleRemoveTeamMember = (memberId: string) => {
    // Don't allow removing yourself (the creator)
    if (memberId === user?.id) {
      setError("Cannot remove yourself as the project owner");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setTeamMembers(teamMembers.filter(member => member.id !== memberId));
  };

  const handleAddStructure = () => {
    if (newStructure.trim() !== '' && !structures.includes(newStructure.trim())) {
      setStructures([...structures, newStructure.trim()]);
      setNewStructure('');
    }
  };

  const handleRemoveStructure = (structureToRemove: string) => {
    setStructures(structures.filter(structure => structure !== structureToRemove));
  };

  const handleAIAssist = (field: string) => {
    setActiveField(field);
    setShowAiAssistant(true);
  };

  // Helper function to ensure string values
  const ensureString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const handleAIResponse = (response: string) => {
    // Update the appropriate field based on activeField
    switch (activeField) {
      case 'title':
        setTitle(response);
        break;
      case 'valuesMissionGoals':
        setValuesMissionGoals(response);
        break;
      case 'zone0':
        setZone0(response);
        break;
      case 'zone1':
        setZone1(response);
        break;
      case 'zone2':
        setZone2(response);
        break;
      case 'zone3':
        setZone3(response);
        break;
      case 'zone4':
        setZone4(response);
        break;
      case 'water':
        setWater(response);
        break;
      case 'soil':
        setSoil(response);
        break;
      case 'power':
        setPower(response);
        break;
      case 'all':
        try {
          const suggestions = JSON.parse(response);
          if (suggestions) {
            if (suggestions.title) setTitle(ensureString(suggestions.title));
            if (suggestions.valuesMissionGoals) setValuesMissionGoals(ensureString(suggestions.valuesMissionGoals));
            if (suggestions.zone0) setZone0(ensureString(suggestions.zone0));
            if (suggestions.zone1) setZone1(ensureString(suggestions.zone1));
            if (suggestions.zone2) setZone2(ensureString(suggestions.zone2));
            if (suggestions.zone3) setZone3(ensureString(suggestions.zone3));
            if (suggestions.zone4) setZone4(ensureString(suggestions.zone4));
            if (suggestions.water) setWater(ensureString(suggestions.water));
            if (suggestions.soil) setSoil(ensureString(suggestions.soil));
            if (suggestions.power) setPower(ensureString(suggestions.power));
            if (suggestions.guilds && Array.isArray(suggestions.guilds)) {
              // Make sure each guild is a string
              const stringGuilds = suggestions.guilds.map((guild: any) => ensureString(guild));
              setGuilds(stringGuilds);
            }
            if (suggestions.structures && Array.isArray(suggestions.structures)) {
              // Make sure each structure is a string
              const stringStructures = suggestions.structures.map((structure: any) => ensureString(structure));
              setStructures(stringStructures);
            }
          }
        } catch (err) {
          console.error("Failed to parse all fields response:", err);
          // Attempt to fix the JSON string if it's malformed
          try {
            // If the response starts with a backtick markdown code block, extract the JSON
            if (response.startsWith('```json') && response.includes('```')) {
              const jsonContent = response.split('```json')[1].split('```')[0].trim();
              const suggestions = JSON.parse(jsonContent);
              
              if (suggestions) {
                if (suggestions.title) setTitle(ensureString(suggestions.title));
                if (suggestions.valuesMissionGoals) setValuesMissionGoals(ensureString(suggestions.valuesMissionGoals));
                if (suggestions.zone0) setZone0(ensureString(suggestions.zone0));
                if (suggestions.zone1) setZone1(ensureString(suggestions.zone1));
                if (suggestions.zone2) setZone2(ensureString(suggestions.zone2));
                if (suggestions.zone3) setZone3(ensureString(suggestions.zone3));
                if (suggestions.zone4) setZone4(ensureString(suggestions.zone4));
                if (suggestions.water) setWater(ensureString(suggestions.water));
                if (suggestions.soil) setSoil(ensureString(suggestions.soil));
                if (suggestions.power) setPower(ensureString(suggestions.power));
                if (suggestions.guilds && Array.isArray(suggestions.guilds)) {
                  setGuilds(suggestions.guilds.map((guild: any) => ensureString(guild)));
                }
                if (suggestions.structures && Array.isArray(suggestions.structures)) {
                  setStructures(suggestions.structures.map((structure: any) => ensureString(structure)));
                }
              }
            }
          } catch (jsonErr) {
            console.error("Failed to fix malformed JSON:", jsonErr);
          }
        }
        break;
      default:
        break;
    }
    setShowAiAssistant(false);
  };

  const handleSuggestAll = () => {
    if (!location) return;
    
    setActiveField('all');
    setShowAiAssistant(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image file is too large. Please select an image under 5MB.");
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please select a valid image file.");
      return;
    }
    
    setImageFile(file);
    
    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // Clear any external URL since we're using an uploaded file
    setImageUrl('');
  };

  const handleExternalImageUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    
    // Clear file upload and preview if using external URL
    if (e.target.value) {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!user || !title || !location) {
      setError("Please provide a title and location to generate an image");
      return;
    }
    
    setGeneratingImage(true);
    setError(null);
    
    try {
      // Generate a prompt based on project details
      const imagePrompt = `A beautiful, realistic landscape image for a permaculture project called "${title}" located in ${location}. The image should show a sustainable landscape with natural elements.`;
      
      const response = await generateWithOpenAI({
        userId: user.id,
        prompt: imagePrompt,
        fieldName: 'projectImage',
        maxTokens: 100
      });
      
      // The response should be a URL to an image
      if (response && response.startsWith('http')) {
        setImageUrl(response);
        setImageFile(null);
        setImagePreview(response);
      } else {
        throw new Error("Failed to generate image URL");
      }
    } catch (err) {
      console.error('Error generating image:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate image. Please try uploading one instead.');
      }
    } finally {
      setGeneratingImage(false);
    }
  };

  const uploadProjectImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `project-images/${fileName}`;
      
      // Check if projects bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const projectsBucket = buckets?.find(bucket => bucket.name === 'projects');
      
      if (!projectsBucket) {
        // Create the bucket if it doesn't exist
        await supabase.storage.createBucket('projects', {
          public: false,
          fileSizeLimit: 5 * 1024 * 1024 // 5MB
        });
      }
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('projects')
        .upload(filePath, imageFile);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = supabase.storage.from('projects').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Process image if provided
      let finalImageUrl = imageUrl;
      
      if (imageFile) {
        finalImageUrl = await uploadProjectImage() || '';
      }
      
      // Extract team member IDs, excluding the creator
      const teamIds = teamMembers
        .filter(member => member.id !== user.id)
        .map(member => member.id);
      
      const projectData = {
        title,
        location,
        property_status: propertyStatus,
        values_mission_goals: valuesMissionGoals,
        guilds,
        team: teamIds,
        zone_0: zone0,
        zone_1: zone1,
        zone_2: zone2,
        zone_3: zone3,
        zone_4: zone4,
        water,
        soil,
        power,
        structures,
        category,
        funding_needs: fundingNeeds,
        created_by: user.id,
        image_url: finalImageUrl || null
      };
      
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert(projectData)
        .select('id')
        .single();
        
      if (insertError) {
        throw insertError;
      }
      
      // Set success message and clear form or redirect
      setSuccess('Project created successfully!');
      
      // Wait a moment then redirect to the project list page
      setTimeout(() => {
        navigate('/projects');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle location selection from the map
  const handleLocationSelect = (latitude: number, longitude: number) => {
    setMapLatitude(latitude);
    setMapLongitude(longitude);
    
    // Use reverse geocoding to get location name if available, otherwise just use coordinates
    if (latitude && longitude) {
      // Format latitude and longitude for display
      const formattedLocation = `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;
      setLocation(formattedLocation);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Create New Project</h1>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {showAiAssistant && (
        <AiAssistant 
          onClose={() => setShowAiAssistant(false)}
          onSubmit={handleAIResponse}
          fieldName={activeField}
          locationContext={location}
        />
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4 relative">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="title">
                Project Title *
              </label>
              <div className="flex">
                <input
                  id="title"
                  type="text"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => handleAIAssist('title')}
                  className="px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                  title="Get AI assistance"
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="md:col-span-2 mb-4">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="location">
                Project Location *
              </label>
              
              <div className="flex mb-2">
                <input
                  id="location"
                  type="text"
                  className={`flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${
                    locationFromMap ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    // Clear map coordinates if user edits the text directly
                    if (locationFromMap && e.target.value !== location) {
                      setLocationFromMap(false);
                      setMapLatitude(null);
                      setMapLongitude(null);
                    }
                  }}
                  required
                  readOnly={locationFromMap}
                  placeholder="Enter a location or use the map"
                />
                <button
                  type="button"
                  onClick={() => setLocationFromMap(!locationFromMap)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  title={locationFromMap ? "Enter location manually" : "Select location on map"}
                >
                  <Globe className="h-5 w-5" />
                </button>
              </div>
              
              {locationFromMap && (
                <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="h-64">
                    <ProjectLocationMap
                      editable={true}
                      height="100%"
                      initialLatitude={mapLatitude || undefined}
                      initialLongitude={mapLongitude || undefined}
                      onLocationAdd={handleLocationSelect}
                    />
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
                    {mapLatitude && mapLongitude ? (
                      <div className="flex justify-between items-center">
                        <span>Selected location: {mapLatitude.toFixed(6)}, {mapLongitude.toFixed(6)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationFromMap(false);
                            setMapLatitude(null);
                            setMapLongitude(null);
                            setLocation('');
                          }}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span>Click on the map to select a location</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {location && (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={handleSuggestAll}
                className="flex items-center justify-center px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Suggest All Fields for {location}
              </button>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
              Property Status *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-green-600 dark:text-green-500"
                  value="owned_land"
                  checked={propertyStatus === 'owned_land'}
                  onChange={() => setPropertyStatus('owned_land')}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-200">Owned Land</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio h-4 w-4 text-yellow-600 dark:text-yellow-500"
                  value="potential_property"
                  checked={propertyStatus === 'potential_property'}
                  onChange={() => setPropertyStatus('potential_property')}
                />
                <span className="ml-2 text-gray-700 dark:text-gray-200">Potential Property</span>
              </label>
            </div>
          </div>
          
          <div className="mb-4 relative">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="valuesMissionGoals">
              Values, Mission & Goals
            </label>
            <div className="flex">
              <textarea
                id="valuesMissionGoals"
                className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={valuesMissionGoals}
                onChange={(e) => setValuesMissionGoals(e.target.value)}
                rows={3}
                placeholder="Describe the purpose and goals of this project"
              ></textarea>
              <button
                type="button"
                onClick={() => handleAIAssist('valuesMissionGoals')}
                className="px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center"
                title="Get AI assistance"
              >
                <Sparkles className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="category">
                Category
              </label>
              <input
                id="category"
                type="text"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Urban Farm, Homestead, etc."
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="fundingNeeds">
                Funding Needs
              </label>
              <input
                id="fundingNeeds"
                type="text"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                value={fundingNeeds}
                onChange={(e) => setFundingNeeds(e.target.value)}
                placeholder="e.g., $5,000 for irrigation system"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
              Project Image
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="mb-2">
                  <label className="block text-gray-700 dark:text-gray-200 text-xs font-medium mb-1">
                    Upload Image
                  </label>
                  <div className="flex items-center">
                    <label className="flex-1 cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <div className="flex items-center justify-center text-gray-500 dark:text-gray-300">
                        <Upload className="h-4 w-4 mr-2" />
                        <span className="text-sm">Choose file</span>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateAIImage}
                      disabled={generatingImage || !title || !location}
                      className="bg-purple-600 dark:bg-purple-700 text-white py-2 px-4 rounded-r-md hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-purple-400 dark:disabled:bg-purple-800 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {generatingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {(!title || !location) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Title and location are required for AI image generation
                    </p>
                  )}
                </div>
                
                <div className="mb-2">
                  <label className="block text-gray-700 dark:text-gray-200 text-xs font-medium mb-1">
                    Or Enter Image URL
                  </label>
                  <input
                    type="url"
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    value={imageUrl}
                    onChange={handleExternalImageUrl}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                {(imagePreview || imageUrl) ? (
                  <div className="relative">
                    <img 
                      src={imagePreview || imageUrl} 
                      alt="Project preview" 
                      className="max-h-40 max-w-full rounded-md object-cover"
                      onError={(e) => {
                        console.error("Image failed to load:", e);
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Preview';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setImageUrl('');
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <ImageIcon className="h-10 w-10 mb-2" />
                    <p className="text-sm text-center">
                      {generatingImage ? 'Generating image...' : 'Image preview will appear here'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Guilds</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            Add categories or types of plants/animals/elements that will be integrated in your project.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {guilds.map((guild, index) => (
              <div 
                key={index}
                className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full text-sm flex items-center"
              >
                {guild}
                <button
                  type="button"
                  onClick={() => handleRemoveGuild(guild)}
                  className="ml-1 text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex">
            <input
              type="text"
              className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              value={newGuild}
              onChange={(e) => setNewGuild(e.target.value)}
              placeholder="Add a guild (e.g., Fruit Trees, Poultry, Water Features)"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGuild())}
            />
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-r-md hover:bg-blue-700 dark:hover:bg-blue-600"
              onClick={handleAddGuild}
            >
              Add
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Team Members</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            Add team members to collaborate on this project.
          </p>
          
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2 flex justify-between">
              <span>Project Team</span>
              {!showMemberSearch && (
                <button 
                  type="button" 
                  onClick={() => setShowMemberSearch(true)}
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Team Member
                </button>
              )}
            </label>
            
            {showMemberSearch ? (
              <div className="mb-4">
                <MemberSearch 
                  onSelect={handleAddTeamMember}
                  excludeIds={teamMembers.map(m => m.id)}
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
              members={teamMembers}
              onRemove={handleRemoveTeamMember}
              onAdd={() => setShowMemberSearch(true)}
              emptyMessage="No team members added yet"
            />
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Team members will be able to view and contribute to this project.
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Permaculture Zones</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            Describe how you'll organize your project according to permaculture zone principles.
            {location && (
              <span className="text-green-600 dark:text-green-400 ml-1">
                Get location-specific recommendations for {location} by clicking the sparkle button.
              </span>
            )}
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="zone0">
                Zone 0 - House/Main Building
              </label>
              <div className="flex">
                <textarea
                  id="zone0"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={zone0}
                  onChange={(e) => setZone0(e.target.value)}
                  rows={2}
                  placeholder={location ? `Describe your home/building for ${location}` : "Describe your home, main building, or central area"}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('zone0')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get location-specific suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="zone1">
                Zone 1 - Frequent Attention
              </label>
              <div className="flex">
                <textarea
                  id="zone1"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={zone1}
                  onChange={(e) => setZone1(e.target.value)}
                  rows={2}
                  placeholder={location ? `Describe frequently visited areas appropriate for ${location}` : "Areas you visit daily - kitchen gardens, herbs, etc."}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('zone1')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get location-specific suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="zone2">
                Zone 2 - Regular Attention
              </label>
              <div className="flex">
                <textarea
                  id="zone2"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={zone2}
                  onChange={(e) => setZone2(e.target.value)}
                  rows={2}
                  placeholder={location ? `Describe areas needing regular attention suitable for ${location}'s climate` : "Areas needing attention every few days - fruit trees, main crops, etc."}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('zone2')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get location-specific suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="zone3">
                Zone 3 - Occasional Attention
              </label>
              <div className="flex">
                <textarea
                  id="zone3"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={zone3}
                  onChange={(e) => setZone3(e.target.value)}
                  rows={2}
                  placeholder={location ? `Describe commercial/large crops appropriate for ${location}` : "Commercial crops, grazing areas, orchards"}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('zone3')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get location-specific suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="zone4">
                Zone 4 - Semi-Wild Areas
              </label>
              <div className="flex">
                <textarea
                  id="zone4"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={zone4}
                  onChange={(e) => setZone4(e.target.value)}
                  rows={2}
                  placeholder={location ? `Describe semi-wild areas suitable for ${location}'s ecosystem` : "Woodlots, wild food collection, minimal management"}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('zone4')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get location-specific suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Infrastructure</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
            Define the infrastructure systems for your project.
            {location && (
              <span className="text-green-600 dark:text-green-400 ml-1">
                Get location-appropriate infrastructure suggestions for {location}.
              </span>
            )}
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="water">
                Water Systems
              </label>
              <div className="flex">
                <textarea
                  id="water"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                  rows={2}
                  placeholder={location ? `Water management strategies for ${location}'s climate and rainfall patterns` : "Describe water collection, storage, irrigation, etc."}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('water')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get water system suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="soil">
                Soil Management
              </label>
              <div className="flex">
                <textarea
                  id="soil"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={soil}
                  onChange={(e) => setSoil(e.target.value)}
                  rows={2}
                  placeholder={location ? `Soil improvement strategies for typical ${location} soil conditions` : "Describe soil types, amendments, composting systems, etc."}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('soil')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get soil management suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="power">
                Power Systems
              </label>
              <div className="flex">
                <textarea
                  id="power"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={power}
                  onChange={(e) => setPower(e.target.value)}
                  rows={2}
                  placeholder={location ? `Appropriate renewable energy options for ${location}` : "Describe electricity, renewable energy, etc."}
                ></textarea>
                <button
                  type="button"
                  onClick={() => handleAIAssist('power')}
                  className={`px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 self-stretch flex items-center location-suggestion-indicator ${location ? 'opacity-100' : 'opacity-100'}`}
                  title={location ? `Get power system suggestions for ${location}` : "Get AI assistance"}
                >
                  <Sparkles className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
                Structures
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {structures.map((structure, index) => (
                  <div 
                    key={index}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-sm flex items-center"
                  >
                    {structure}
                    <button
                      type="button"
                      onClick={() => handleRemoveStructure(structure)}
                      className="ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={newStructure}
                  onChange={(e) => setNewStructure(e.target.value)}
                  placeholder={location ? `Buildings appropriate for ${location}'s climate` : "Add buildings, sheds, greenhouses, etc."}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStructure())}
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-r-md hover:bg-gray-700 dark:hover:bg-gray-600"
                  onClick={handleAddStructure}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-green-600 dark:bg-green-700 text-white py-3 px-4 rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Project...
              </span>
            ) : (
              <span className="flex items-center">
                <Save className="h-5 w-5 mr-2" />
                Create Project
              </span>
            )}
          </button>
          
          <button
            type="button"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 px-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            onClick={() => navigate('/projects')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectCreateForm;