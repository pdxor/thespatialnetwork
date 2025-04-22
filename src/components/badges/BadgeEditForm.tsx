import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Award, Save, Upload, Image as ImageIcon, X } from 'lucide-react';

interface Badge {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const BadgeEditForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [badge, setBadge] = useState<Badge | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchBadge = async () => {
      try {
        const { data, error } = await supabase
          .from('badges')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (!data) {
          setError('Badge not found');
          return;
        }
        
        // Check if user is the creator
        if (data.created_by !== user.id) {
          setError('You do not have permission to edit this badge');
          return;
        }
        
        setBadge(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setImageUrl(data.image_url || '');
        
        // If there's an image URL, set it as the preview
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
        
      } catch (err) {
        console.error('Error fetching badge:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while loading the badge');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchBadge();
  }, [id, user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("Image file is too large. Please select an image under 2MB.");
        return;
      }
      
      // Check file type
      if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
        setError("Please select a PNG or JPEG image file.");
        return;
      }
      
      setImageFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear any external URL since we're using an uploaded file
      setImageUrl('');
    }
  };

  const handleExternalImageUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    
    // Clear file upload and preview if using external URL
    if (e.target.value) {
      setImageFile(null);
      setImagePreview(e.target.value);
    }
  };

  const uploadBadgeImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('badges')
        .upload(filePath, imageFile);
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data } = supabase.storage.from('badges').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading badge image:', err);
      throw new Error('Failed to upload badge image. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !badge) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Process image if provided
      let finalImageUrl = imageUrl;
      
      if (imageFile) {
        finalImageUrl = await uploadBadgeImage() || '';
      }
      
      if (!finalImageUrl && !imageFile && !badge.image_url) {
        throw new Error('Please provide an image for the badge');
      }
      
      // Update badge in database
      const { error } = await supabase
        .from('badges')
        .update({
          title,
          description,
          image_url: finalImageUrl || badge.image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess('Badge updated successfully!');
      
      // Navigate to badge detail view after success
      setTimeout(() => {
        navigate(`/badges/${id}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error updating badge:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update badge. Please try again.');
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

  if (error && !badge) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/badges')}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Return to Badges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <Award className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
        Edit Badge
      </h1>
      
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
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="title">
            Badge Title *
          </label>
          <input
            id="title"
            type="text"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter badge title"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter badge description"
            rows={3}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-medium mb-2">
            Badge Image *
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-2">
                <label className="block text-gray-700 dark:text-gray-200 text-xs font-medium mb-1">
                  Upload New Image
                </label>
                <div className="flex items-center">
                  <label className="flex-1 cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <div className="flex items-center justify-center text-gray-500 dark:text-gray-300">
                      <Upload className="h-4 w-4 mr-2" />
                      <span className="text-sm">Choose PNG or JPEG</span>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Recommended size: 256x256 pixels, max 2MB
                </p>
              </div>
              
              <div className="mb-2">
                <label className="block text-gray-700 dark:text-gray-200 text-xs font-medium mb-1">
                  Or Enter Image URL
                </label>
                <input
                  type="url"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  value={imageUrl}
                  onChange={handleExternalImageUrl}
                  placeholder="https://example.com/badge.png"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Badge preview" 
                    className="max-h-40 max-w-full rounded-md object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=Badge';
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
                  <Award className="h-10 w-10 mb-2 text-purple-400 dark:text-purple-500" />
                  <p className="text-sm text-center">
                    Badge image preview will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
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
            onClick={() => navigate(`/badges/${id}`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BadgeEditForm;