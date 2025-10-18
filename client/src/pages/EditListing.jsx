import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';
import { uploadFile } from '../services/upload';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/categories';

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsAPI.getById(id),
    enabled: !!id,
  });

  const listing = data?.listing || data; // support {listing} or direct

  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);

  const defaultValues = useMemo(() => ({
    title: listing?.title || '',
    description: listing?.description || '',
    price: listing?.price || '',
    condition: listing?.condition || 'good',
    category: listing?.category || '',
    subcategory: listing?.subcategory || '',
    address: listing?.address || '',
    payment_methods: (listing?.payment_methods || []).join(', '),
    payment_instructions: listing?.payment_instructions || '',
    pickup: listing?.pickup_options?.pickup || false,
    courier: listing?.pickup_options?.courier || false,
    meeting_spots: (listing?.pickup_options?.meeting_spots || []).join(', '),
  }), [listing]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({ defaultValues });

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
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(uploadFile));
      setImages(prev => [...prev, ...uploaded]);
      toast.success(`${files.length} image(s) uploaded`);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (form) => {
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      condition: form.condition,
      payment_methods: form.payment_methods.split(',').map(s => s.trim()).filter(Boolean),
      payment_instructions: form.payment_instructions,
      images,
      category: form.category,
      subcategory: form.subcategory,
      address: form.address,
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
      <h1 className="text-3xl font-bold mb-6">{t('editListing')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
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

        <div>
          <label className="block text-sm font-medium mb-2">Address *</label>
          <input {...register('address', { required: true, maxLength: 300 })} className="input" placeholder="City, Area, Landmark" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t('titleLabel')}</label>
          <input {...register('title', { required: 'Title is required', maxLength: 200 })} className="input" />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('descriptionLabel')}</label>
          <textarea {...register('description', { required: 'Description is required' })} className="input" rows="6" />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('priceLabel')}</label>
            <input type="number" {...register('price', { required: 'Price is required', min: 0 })} className="input" />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('conditionLabel')}</label>
            <select {...register('condition')} className="input">
              <option value="new">New</option>
              <option value="like-new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('paymentMethodsLabel')}</label>
          <select {...register('payment_methods', { required: 'At least one payment method required' })} className="input" multiple>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Hold Ctrl (Cmd on Mac) to select multiple</p>
          {errors.payment_methods && <p className="text-red-500 text-sm mt-1">{errors.payment_methods.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('paymentInstructionsLabel')}</label>
          <textarea {...register('payment_instructions')} className="input" rows="3" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('addImagesLabel')}</label>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="input" />
          <p className="text-sm text-gray-500 mt-1">{t('addImagesHelp')}</p>
          {uploading && <p className="text-primary-600 mt-2">Uploading...</p>}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {images.map((img, idx) => (
              <img key={idx} src={img.url} alt="" className="w-full h-24 object-contain bg-gray-50 rounded" />
            ))}
          </div>
        </div>

        <div className="flex space-x-4">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">{t('cancel')}</button>
          <button type="submit" disabled={updateMutation.isPending || uploading} className="btn btn-primary">
            {updateMutation.isPending ? 'Saving...' : t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditListing;


