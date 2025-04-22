import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Award, Save, Upload, X, Plus } from 'lucide-react';

const BadgeCreateForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearImage = useCallback(() => {
    setImagePreview(null);
    setImageFile(null);
    setImageUrl('');
  }, []);

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
      
      // Create a preview using URL.createObjectURL instead of FileReader
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      
      // Clean up the old URL if it exists
      return () => URL.revokeObjectURL(objectUrl);
      
      // Clear any external URL since we're using an uploaded file
      setImageUrl('');
    }
  };

  const handleExternalImageUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    setImageUrl(url);
    
    // Clear file upload and preview if using external URL
    if (url) {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const ensureBadgesBucketExists = async (): Promise<void> => {
    try {
      // Check if the bucket exists
      const { data: buckets, error: listError } = await supabase
        .storage
        .listBuckets();

      if (listError) throw listError;

      const badgesBucket = buckets?.find(b => b.name === 'badges');
      
      if (!badgesBucket) {
        // Create the bucket if it doesn't exist
        const { error: createError } = await supabase
          .storage
          .createBucket('badges', {
            public: true, // Make bucket public
            fileSizeLimit: 2097152, // 2MB in bytes
            allowedMimeTypes: ['image/png', 'image/jpeg']
          });

        if (createError) {
          throw new Error('Failed to create storage bucket. Please contact support.');
        }
      }
    } catch (err) {
      console.error('Error ensuring badges bucket exists:', err);
      throw new Error('Storage system is not properly configured. Please contact support.');
    }
  };

  const uploadBadgeImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    
    try {
      // Ensure the badges bucket exists before uploading
      await ensureBadgesBucketExists();
      
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('badges')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload badge image. Please try again or contact support if the issue persists.');
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage.from('badges').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading badge image:', err);
      if (err instanceof Error) {
        throw new Error(err.message);
      }
      throw new Error('Failed to upload badge image. Please try again or contact support if the issue persists.');
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
        try {
          finalImageUrl = await uploadBadgeImage() || '';
        } catch (uploadErr) {
          if (uploadErr instanceof Error) {
            throw new Error(uploadErr.message);
          }
          throw new Error('Failed to upload badge image. Please try again or contact support if the issue persists.');
        }
      }
      
      if (!finalImageUrl && !imageFile) {
        throw new Error('Please provide an image for the badge');
      }
      
      // Create badge in database
      const { data, error: dbError } = await supabase
        .from('badges')
        .insert({
          title,
          description,
          image_url: finalImageUrl,
          created_by: user.id
        })
        .select('id')
        .single();
        
      if (dbError) {
        if (dbError.message.includes('policy')) {
          throw new Error('You do not have permission to create badges.');
        }
        throw dbError;
      }
      
      setSuccess('Badge created successfully!');
      
      // Navigate to badges list after success
      setTimeout(() => {
        navigate('/badges');
      }, 1500);
      
    } catch (err) {
      console.error('Error creating badge:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create badge. Please try again or contact support if the issue persists.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <Award className="h-6 w-6 mr-2 text-purple-600 dark:text-purple-400" />
        Create New Badge
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
                  Upload Image
                </label>
                <div className="flex items-center">
                  <label className="flex-1 cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleImageChange}
                      key={imageFile ? undefined : 'reset'} // Reset the input when cleared
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
              {(imagePreview || imageUrl) ? (
                <div className="relative">
                  <img 
                    src={imagePreview || imageUrl} 
                    alt="Badge preview" 
                    className="max-h-40 max-w-full rounded-md object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
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
            className="bg-purple-600 dark:bg-purple-700 text-white py-2 px-6 rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                Create Badge
              </>
            )}
          </button>
          
          <button
            type="button"
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-6 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            onClick={() => navigate('/badges')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BadgeCreateForm;