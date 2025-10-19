import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';
import { uploadFile } from '../services/upload';
import toast from 'react-hot-toast';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import ETHIOPIAN_LOCATIONS from '../constants/locations';
import { getCategoryIcon, getSubcategoryIcon } from '../constants/categoryIcons';

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsAPI.getById(id),
    enabled: !!id,
  });

  const listing = data?.listing || data; // support {listing} or direct

  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);

  const defaultValues = useMemo(() => {
    const paymentInstructions = listing?.payment_instructions || {};
    return {
      title: listing?.title || '',
      description: listing?.description || '',
      price: listing?.price || '',
      priceType: listing?.priceType || 'fixed',
      condition: listing?.condition || 'good',
      status: listing?.status || 'active',
      category: listing?.category || '',
      subcategory: listing?.subcategory || '',
      'location.region': listing?.location?.region || '',
      'location.zone': listing?.location?.zone || '',
      'location.specificAddress': listing?.location?.specificAddress || '',
      payment_methods: listing?.payment_methods || [],
      payment_instructions_cash: paymentInstructions.cash || '',
      payment_instructions_bank: paymentInstructions.bank || '',
      payment_instructions_telebirr: paymentInstructions.telebirr || '',
      payment_instructions_mpesa: paymentInstructions.mpesa || '',
      pickup: listing?.pickup_options?.pickup || false,
      courier: listing?.pickup_options?.courier || false,
      meeting_spots: (listing?.pickup_options?.meeting_spots || []).join(', '),
    };
  }, [listing]);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({ defaultValues });

  const selectedCategory = watch('category');
  const selectedRegion = watch('location.region');
  const selectedPaymentMethods = watch('payment_methods') || [];
  
  // Categories that don't need condition field
  const categoriesWithoutCondition = ['Jobs', 'Services', 'Repair & Construction', 'Property'];
  const shouldShowCondition = !categoriesWithoutCondition.includes(selectedCategory);

  // Reset subcategory when category changes
  useEffect(() => {
    if (selectedCategory && listing?.category !== selectedCategory) {
      setValue('subcategory', '');
    }
  }, [selectedCategory, listing, setValue]);

  // Reset zone when region changes
  useEffect(() => {
    if (selectedRegion && listing?.location?.region !== selectedRegion) {
      setValue('location.zone', '');
    }
  }, [selectedRegion, listing, setValue]);

  useEffect(() => {
    reset(defaultValues);
    setImages(listing?.images || []);
  }, [defaultValues, listing, reset]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => listingsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Listing updated!');
      queryClient.invalidateQueries(['listings']);
      queryClient.invalidateQueries(['listings', 'my-listings']);
      queryClient.invalidateQueries(['listing', id]);
      navigate('/seller-dashboard');
    },
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if total images would exceed limit
    if (images.length + files.length > 10) {
      toast.error(`You can only upload up to 10 images total. Currently have ${images.length}.`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
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
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    toast.success('Image removed');
  };

  const onSubmit = (form) => {
    const paymentMethods = Array.isArray(form.payment_methods)
      ? form.payment_methods
      : [form.payment_methods].filter(Boolean);

    // Build payment instructions object
    const paymentInstructions = {};
    if (paymentMethods.includes('Cash')) {
      paymentInstructions.cash = form.payment_instructions_cash;
    }
    if (paymentMethods.includes('Bank Transfer')) {
      paymentInstructions.bank = form.payment_instructions_bank;
    }
    if (paymentMethods.includes('Telebirr')) {
      paymentInstructions.telebirr = form.payment_instructions_telebirr;
    }
    if (paymentMethods.includes('M-Pesa')) {
      paymentInstructions.mpesa = form.payment_instructions_mpesa;
    }

    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      priceType: form.priceType || 'fixed',
      condition: shouldShowCondition ? (form.condition || 'good') : 'not-applicable',
      status: form.status || 'active',
      payment_methods: paymentMethods,
      payment_instructions: paymentInstructions,
      images,
      category: form.category,
      subcategory: form.subcategory,
      location: {
        region: form.location.region,
        zone: form.location.zone,
        specificAddress: form.location.specificAddress,
      },
      pickup_options: {
        pickup: !!form.pickup,
        courier: !!form.courier,
        meeting_spots: form.meeting_spots ? form.meeting_spots.split(',').map(s => s.trim()).filter(Boolean) : [],
      },
    };
    updateMutation.mutate({ id, data: payload });
  };

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Listing</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
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
          <h3 className="text-lg font-semibold">Location *</h3>
          
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
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input {...register('title', { required: 'Title is required', maxLength: 200 })} className="input" />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea {...register('description', { required: 'Description is required' })} className="input" rows="6" />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Price *</label>
            <input type="number" {...register('price', { required: 'Price is required', min: 0 })} className="input" />
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

        <div>
          <label className="block text-sm font-medium mb-2">Listing Status *</label>
          <select {...register('status')} className="input">
            <option value="active">Active (Available for Sale)</option>
            <option value="sold">Sold</option>
            <option value="pending">Pending (Under Review)</option>
            <option value="suspended">Suspended</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Mark as "Sold" when item is no longer available</p>
        </div>

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
          <label className="block text-sm font-medium mb-2">Add/Update Images</label>
          <input 
            type="file" 
            accept="image/*,.heic,.heif" 
            multiple 
            onChange={handleImageUpload} 
            className="input"
            id="image-upload-edit"
          />
          <p className="text-sm text-gray-500 mt-1">
            📸 Upload up to 10 images (max 10MB each). 
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
          <button type="submit" disabled={updateMutation.isPending || uploading} className="btn btn-primary">
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditListing;


