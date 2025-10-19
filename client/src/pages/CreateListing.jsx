import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';
import { uploadFile } from '../services/upload';
import toast from 'react-hot-toast';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';
import ETHIOPIAN_LOCATIONS from '../constants/locations';

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

  const selectedCategory = watch('category');
  const selectedRegion = watch('location.region');
  const selectedPaymentMethods = watch('payment_methods') || [];

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
    onSuccess: () => {
      toast.success('Listing created successfully!');
      queryClient.invalidateQueries(['listings']);
      navigate('/seller-dashboard');
    },
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => uploadFile(file));
      const results = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...results]);
      toast.success(`${files.length} image(s) uploaded`);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    const paymentMethods = Array.isArray(data.payment_methods)
      ? data.payment_methods
      : [data.payment_methods].filter(Boolean);

    // Build payment instructions object
    const paymentInstructions = {};
    if (paymentMethods.includes('Cash')) {
      paymentInstructions.cash = data.payment_instructions_cash;
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
      price: data.price,
      condition: data.condition,
      category: data.category,
      subcategory: data.subcategory,
      location: data.location,
      images,
      payment_methods: paymentMethods,
      payment_instructions: paymentInstructions,
      pickup_options: {
        pickup: data.pickup || false,
        courier: data.courier || false,
        meeting_spots: data.meeting_spots ? data.meeting_spots.split(',').map(s => s.trim()) : [],
      },
    };

    createMutation.mutate(listingData);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Listing</h1>

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
              <option>Vehicles</option>
              <option>Property</option>
              <option>Mobile Phones & Tablets</option>
              <option>Electronics</option>
              <option>Home, Furniture & Appliances</option>
              <option>Fashion</option>
              <option>Beauty & Personal Care</option>
              <option>Services</option>
              <option>Repair & Construction</option>
              <option>Commercial Equipment & Tools</option>
              <option>Leisure & Activities</option>
              <option>Babies & Kids</option>
              <option>Food, Agriculture & Farming</option>
              <option>Animals & Pets</option>
              <option>Jobs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subcategory *</label>
            <select {...register('subcategory', { required: true })} className="input">
              <option value="">Select subcategory</option>
              {(CATEGORIES[watch('category')] || []).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
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
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Price (ETB) *</label>
            <input type="number" {...register('price', { required: 'Price is required', min: 0 })} className="input" placeholder="50000" />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
          </div>

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
          <label className="block text-sm font-medium mb-2">Images *</label>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="input" />
          <p className="text-sm text-gray-500 mt-1">Upload at least one image (max 10). Supported formats: JPG, PNG, WebP</p>
          {uploading && <p className="text-primary-600 mt-2">Uploading...</p>}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {images.map((img, idx) => (
              <img key={idx} src={img.url} alt="" className="w-full h-24 object-contain bg-gray-50 rounded" />
            ))}
          </div>
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

