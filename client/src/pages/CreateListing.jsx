import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';
import { uploadFile } from '../services/upload';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const CreateListing = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm();

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

    const listingData = {
      ...data,
      images,
      payment_methods: data.payment_methods.split(',').map(m => m.trim()),
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
      <h1 className="text-3xl font-bold mb-6">{t('createNewListing')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* TOS Disclaimer */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-gray-800">
            <strong>Terms:</strong> The platform does not handle payments. Any transaction is between buyer and seller. 
            We are not liable for off-site payment disputes.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('titleLabel')}</label>
          <input {...register('title', { required: 'Title is required', maxLength: 200 })} className="input" placeholder="e.g., iPhone 13 Pro Max" />
          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('descriptionLabel')}</label>
          <textarea {...register('description', { required: 'Description is required' })} className="input" rows="6" placeholder="Describe your item..." />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('priceLabel')}</label>
            <input type="number" {...register('price', { required: 'Price is required', min: 0 })} className="input" placeholder="50000" />
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
          <input {...register('payment_methods', { required: 'At least one payment method required' })} className="input" placeholder="cash, m-birr, bank-transfer" />
          {errors.payment_methods && <p className="text-red-500 text-sm mt-1">{errors.payment_methods.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('paymentInstructionsLabel')}</label>
          <textarea {...register('payment_instructions')} className="input" rows="3" placeholder="e.g., M-Birr: 0912-345-678" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('imagesLabel')}</label>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="input" />
          <p className="text-sm text-gray-500 mt-1">{t('uploadHint')}</p>
          {uploading && <p className="text-primary-600 mt-2">Uploading...</p>}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {images.map((img, idx) => (
              <img key={idx} src={img.url} alt="" className="w-full h-24 object-contain bg-gray-50 rounded" />
            ))}
          </div>
        </div>

        <div className="flex space-x-4">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">{t('cancel')}</button>
          <button type="submit" disabled={createMutation.isPending || uploading} className="btn btn-primary">
            {createMutation.isPending ? t('creating') : t('create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateListing;

