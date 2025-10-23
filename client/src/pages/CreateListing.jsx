import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';
import { uploadFile } from '../services/upload';
import toast from 'react-hot-toast';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import ETHIOPIAN_LOCATIONS from '../constants/locations';
import { getCategoryIcon, getSubcategoryIcon } from '../constants/categoryIcons';
import BackButton from '../components/BackButton';

const CreateListing = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      payment_methods: [],
    }
  });
  
  // Load saved address from localStorage on component mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('lastListingAddress');
    if (savedAddress) {
      try {
        const addressData = JSON.parse(savedAddress);
        console.log('📍 Loading saved address:', addressData);
        
        // Pre-fill address fields
        if (addressData.region) {
          setValue('location.region', addressData.region);
        }
        if (addressData.zone) {
          setValue('location.zone', addressData.zone);
        }
        if (addressData.specificAddress) {
          setValue('location.specificAddress', addressData.specificAddress);
        }
        
        toast.success('✅ Previous address loaded', {
          duration: 2000,
          icon: '📍'
        });
      } catch (error) {
        console.error('Failed to load saved address:', error);
      }
    }
  }, [setValue]);

  const selectedCategory = watch('category');
  const selectedRegion = watch('location.region');
  const selectedPaymentMethods = watch('payment_methods') || [];
  
  // Categories that don't need condition field
  const categoriesWithoutCondition = ['Jobs', 'Services', 'Repair & Construction', 'Property'];
  const shouldShowCondition = !categoriesWithoutCondition.includes(selectedCategory);

  // Reset subcategory when category changes
  useEffect(() => {
    setValue('subcategory', '');
  }, [selectedCategory, setValue]);

  // Reset zone when region changes
  useEffect(() => {
    setValue('location.zone', '');
  }, [selectedRegion, setValue]);

  const createMutation = useMutation({
    mutationFn: listingsAPI.create,
    onSuccess: (data, variables) => {
      // Save the address to localStorage for future listings
      if (variables.location) {
        const addressData = {
          region: variables.location.region,
          zone: variables.location.zone,
          specificAddress: variables.location.specificAddress
        };
        localStorage.setItem('lastListingAddress', JSON.stringify(addressData));
        console.log('💾 Saved address for future listings');
      }
      
      toast.success('Listing created successfully! It will be reviewed by admin before going live.');
      queryClient.invalidateQueries(['listings']);
      navigate('/seller-dashboard');
    },
    onError: (error) => {
      console.error('Create listing error:', error);
      const errorMessage = error?.response?.data?.message 
        || error?.message 
        || 'Failed to create listing. Please try again.';
      toast.error(errorMessage);
      
      // Show detailed error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error details:', {
          response: error?.response?.data,
          message: error?.message,
          stack: error?.stack
        });
      }
    }
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if total images would exceed limit
    if (images.length + files.length > 10) {
      toast.error(`You can only upload up to 10 images total. Currently have ${images.length}.`);
      e.target.value = ''; // Reset input
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Upload files one by one to show progress and handle individual failures
      for (const file of files) {
        try {
          console.log('Uploading:', file.name, 'Type:', file.type, 'Size:', file.size);
          const result = await uploadFile(file);
          setImages(prev => [...prev, result]);
          successCount++;
        } catch (error) {
          console.error('Failed to upload:', file.name, error);
          failCount++;
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} image(s) uploaded successfully!`);
      }
      if (failCount > 0 && successCount === 0) {
        toast.error(`❌ Failed to upload ${failCount} image(s). Please try again.`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input so user can retry same files
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    toast.success('Image removed');
  };

  const onSubmit = async (data) => {
    console.log('Form data submitted:', data);
    
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    const paymentMethods = Array.isArray(data.payment_methods)
      ? data.payment_methods
      : [data.payment_methods].filter(Boolean);

    if (paymentMethods.length === 0) {
      toast.error('Please select at least one payment method');
      return;
    }

    // Build payment instructions object
    const paymentInstructions = {};
    if (paymentMethods.includes('Cash')) {
      paymentInstructions.cash = data.payment_instructions_cash || 'Cash payment accepted';
    }
    if (paymentMethods.includes('Bank Transfer')) {
      paymentInstructions.bank = data.payment_instructions_bank;
    }
    if (paymentMethods.includes('Telebirr')) {
      paymentInstructions.telebirr = data.payment_instructions_telebirr;
    }
    if (paymentMethods.includes('M-Pesa')) {
      paymentInstructions.mpesa = data.payment_instructions_mpesa;
    }

    const listingData = {
      title: data.title,
      description: data.description,
      price: Number(data.price),
      priceType: data.priceType || 'fixed',
      currency: 'ETB', // Default currency
      condition: shouldShowCondition ? (data.condition || 'good') : 'not-applicable',
      category: data.category,
      subcategory: data.subcategory,
      location: data.location,
      images,
      payment_methods: paymentMethods,
      payment_instructions: paymentInstructions,
      pickup_options: {
        pickup: data.pickup || false,
        courier: data.courier || false,
        meeting_spots: data.meeting_spots ? data.meeting_spots.split(',').map(s => s.trim()).filter(Boolean) : [],
      },
      highValue: false, // Default to false
    };

    console.log('Listing data to send:', listingData);
    createMutation.mutate(listingData);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <h1 className="text-3xl font-bold mb-6">Create New Listing</h1>

      {/* Helpful Tips */}
      {createMutation.isError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Failed to Create Listing</h3>
          <p className="text-sm text-red-700 mb-3">
            {createMutation.error?.response?.data?.message || 
             createMutation.error?.message || 
             'An error occurred while creating your listing.'}
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-red-800 font-medium mb-2">Troubleshooting Steps</summary>
            <ul className="list-disc list-inside space-y-1 text-red-700 ml-2">
              <li>Make sure you're registered as a seller (check "I want to sell items" during registration)</li>
              <li>Ensure all required fields (*) are filled</li>
              <li>Upload at least one image (JPG, PNG, or WebP, max 8MB)</li>
              <li>Select at least one payment method</li>
              <li>Check your internet connection</li>
              <li>Try refreshing the page and logging in again</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-red-300">
              <p className="font-medium mb-1">Still having issues?</p>
              <p>Email: <a href="mailto:yonatanhaile06@gmail.com" className="underline">yonatanhaile06@gmail.com</a></p>
              <p>Phone: <a href="tel:+251914888890" className="underline">+251 914 888 890</a></p>
            </div>
          </details>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* TOS Disclaimer */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-gray-800">
            <strong>Terms:</strong> The platform does not handle payments. Any transaction is between buyer and seller. 
            We are not liable for off-site payment disputes.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input {...register('title', { required: 'Title is required', maxLength: 200 })} className="input" placeholder="e.g., iPhone 13 Pro Max" />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea {...register('description', { required: 'Description is required' })} className="input" rows="6" placeholder="Describe your item..." />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select {...register('category', { required: true })} className="input">
              <option value="">Select category</option>
              {Object.keys(CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryIcon(cat)} {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subcategory *</label>
            <select {...register('subcategory', { required: true })} className="input">
              <option value="">Select subcategory</option>
              {(CATEGORIES[watch('category')] || []).map((sub) => (
                <option key={sub} value={sub}>
                  {getSubcategoryIcon(sub)} {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Location *</h3>
            {localStorage.getItem('lastListingAddress') && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Address loaded from last listing
              </span>
            )}
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Region *</label>
              <select {...register('location.region', { required: 'Region is required' })} className="input">
                <option value="">Select region</option>
                {Object.keys(ETHIOPIAN_LOCATIONS).map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
              {errors.location?.region && <p className="text-red-500 text-sm mt-1">{errors.location.region.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Zone/Sub-city *</label>
              <select 
                {...register('location.zone', { required: 'Zone/Sub-city is required' })} 
                className="input"
                disabled={!selectedRegion}
              >
                <option value="">Select zone/sub-city</option>
                {selectedRegion && ETHIOPIAN_LOCATIONS[selectedRegion]?.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
              {errors.location?.zone && <p className="text-red-500 text-sm mt-1">{errors.location.zone.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Specific Address *</label>
            <input 
              {...register('location.specificAddress', { 
                required: 'Specific address is required',
                maxLength: { value: 300, message: 'Address cannot exceed 300 characters' }
              })} 
              className="input" 
              placeholder="e.g., Near Piazza, Next to Commercial Bank, Building Name, House Number" 
            />
            {errors.location?.specificAddress && <p className="text-red-500 text-sm mt-1">{errors.location.specificAddress.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Enter your exact address (street name, building, landmarks)</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Price (ETB) *</label>
            <input type="number" {...register('price', { required: 'Price is required', min: 0 })} className="input" placeholder="50000" />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price Type *</label>
            <select {...register('priceType')} className="input">
              <option value="fixed">Fixed Price</option>
              <option value="per-hour">Per Hour</option>
              <option value="per-day">Per Day</option>
              <option value="per-month">Per Month</option>
              <option value="contract">Contract/Project</option>
              <option value="negotiable">Negotiable</option>
            </select>
          </div>
        </div>

        {shouldShowCondition && (
          <div>
            <label className="block text-sm font-medium mb-2">Condition *</label>
            <select {...register('condition')} className="input">
              <option value="new">New</option>
              <option value="like-new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        )}
        {/* Payment Methods */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3">Payment Methods * (Select at least one)</label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(method => (
                <label key={method} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    value={method}
                    {...register('payment_methods', { 
                      required: 'Please select at least one payment method',
                      validate: value => (Array.isArray(value) && value.length > 0) || 'Please select at least one payment method'
                    })}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="font-medium">{method}</span>
                </label>
              ))}
            </div>
            {errors.payment_methods && <p className="text-red-500 text-sm mt-1">{errors.payment_methods.message}</p>}
          </div>

          {/* Dynamic Payment Instructions */}
          {selectedPaymentMethods.length > 0 && (
            <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900">Payment Instructions *</h4>
              <p className="text-sm text-blue-700">Provide specific details for each selected payment method</p>
              
              {selectedPaymentMethods.includes('Cash') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Cash Payment Instructions</label>
                  <textarea 
                    {...register('payment_instructions_cash', { required: selectedPaymentMethods.includes('Cash') })}
                    className="input" 
                    rows="2" 
                    placeholder="e.g., Cash on delivery, Cash upon meeting, etc."
                  />
                  {errors.payment_instructions_cash && <p className="text-red-500 text-xs mt-1">Required</p>}
                </div>
              )}

              {selectedPaymentMethods.includes('Bank Transfer') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Transfer Details *</label>
                  <textarea 
                    {...register('payment_instructions_bank', { required: selectedPaymentMethods.includes('Bank Transfer') })}
                    className="input" 
                    rows="3" 
                    placeholder="Bank Name: Commercial Bank of Ethiopia&#10;Account Name: John Doe&#10;Account Number: 1234567890&#10;Branch: Addis Ababa"
                  />
                  {errors.payment_instructions_bank && <p className="text-red-500 text-xs mt-1">Required</p>}
                </div>
              )}

              {selectedPaymentMethods.includes('Telebirr') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Telebirr Details *</label>
                  <input 
                    {...register('payment_instructions_telebirr', { 
                      required: selectedPaymentMethods.includes('Telebirr'),
                      pattern: { value: /^[0-9]{10}$/, message: 'Enter valid 10-digit phone number' }
                    })}
                    className="input" 
                    placeholder="0912345678 (10 digits)"
                    maxLength="10"
                  />
                  {errors.payment_instructions_telebirr && <p className="text-red-500 text-xs mt-1">{errors.payment_instructions_telebirr.message || 'Required'}</p>}
                </div>
              )}

              {selectedPaymentMethods.includes('M-Pesa') && (
                <div>
                  <label className="block text-sm font-medium mb-1">M-Pesa Details *</label>
                  <input 
                    {...register('payment_instructions_mpesa', { 
                      required: selectedPaymentMethods.includes('M-Pesa'),
                      pattern: { value: /^[0-9]{10}$/, message: 'Enter valid 10-digit phone number' }
                    })}
                    className="input" 
                    placeholder="0912345678 (10 digits)"
                    maxLength="10"
                  />
                  {errors.payment_instructions_mpesa && <p className="text-red-500 text-xs mt-1">{errors.payment_instructions_mpesa.message || 'Required'}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Images *</label>
          <input 
            type="file" 
            accept="image/*,.heic,.heif" 
            multiple 
            onChange={handleImageUpload} 
            className="input"
            id="image-upload"
          />
          <p className="text-sm text-gray-500 mt-1">
            📸 Upload at least one image (max 10MB each). 
            <span className="block sm:inline"> Supported: JPG, PNG, WebP, HEIC</span>
          </p>
          {uploading && (
            <div className="flex items-center gap-2 mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <p className="text-purple-600 font-medium">Uploading images...</p>
            </div>
          )}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={img.url} 
                    alt="" 
                    className="w-full h-32 object-cover bg-gray-50 rounded-lg border-2 border-gray-200" 
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                    title="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex space-x-4">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={createMutation.isPending || uploading} className="btn btn-primary">
            {createMutation.isPending ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateListing;

