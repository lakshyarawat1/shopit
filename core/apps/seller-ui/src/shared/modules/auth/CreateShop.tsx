import { useMutation } from '@tanstack/react-query';
import { shopCategories } from '../../../constants/shopCategories';
import axios from 'axios';
import React from 'react'
import { useForm } from 'react-hook-form'

const CreateShop = ({
    sellerId,
    setActiveStep,
}: {
        sellerId: string,
    setActiveStep: (step: number) => void
    }) => {
    
    const { register, handleSubmit, formState: { errors } } = useForm(); 

    const createShopMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/create-shop`, data);

            return response.data;
      },
      onSuccess: () => {
        setActiveStep(3);
      }
    })
  
  const countWords = (text: string) => text.trim().split(/\s+/).length;
  
  const onSubmit = async (data: any) => { 
    const shopData = { ...data, sellerId }

    createShopMutation.mutate(shopData);
  }
    
  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <h3 className="text-2xl font-semibold text-center mb-4">
          Setup new shop{' '}
        </h3>
        <label className="block text-gray-700 mb-1">Name *</label>
        <input
          type="text"
          placeholder="Shop Name"
          className="w-full p-2 border border-gray-300 outline-none rounded-[4px] mb-1"
          {...register('name', {
            required: 'Name is required.',
          })}
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{String(errors.name.message)}</p>
        )}
        <label className="block text-gray-700 mb-1">
          Description * (max 100 words)
        </label>
        <input
          type="text"
          placeholder="Shop Description"
          className="w-full p-2 border border-gray-300 outline-none rounded-[4px] mb-1"
          {...register('description', {
            required: 'Description is required.',
            validate: (value) =>
              countWords(value) <= 100 || 'Bio cannot be more than 100 words',
          })}
        />
        {errors.bio && (
          <p className="text-red-500 text-sm">{String(errors.bio.message)}</p>
        )}
        <label className="block text-gray-700 mb-1">Address *</label>
        <input
          type="text"
          placeholder="Shop Address"
          className="w-full p-2 border border-gray-300 outline-none rounded-[4px] mb-1"
          {...register('address', {
            required: 'Address is required.',
          })}
        />
        {errors.address && (
          <p className="text-red-500 text-sm">
            {String(errors.address.message)}
          </p>
        )}
        <label className="block text-gray-700 mb-1">Opening Hours *</label>
        <input
          type="text"
          placeholder="e.g. 9:00 AM - 5:00 PM"
          className="w-full p-2 border border-gray-300 outline-none rounded-[4px] mb-1"
          {...register('opening_hrs', {
            required: 'Opening Hours is required.',
          })}
        />
        {errors.opening_hrs && (
          <p className="text-red-500 text-sm">
            {String(errors.opening_hrs.message)}
          </p>
        )}
        <label className="block text-gray-700 mb-1">Website</label>
        <input
          type="text"
          placeholder="https://example.com"
          className="w-full p-2 border border-gray-300 outline-none rounded-[4px] mb-1"
          {...register('website', {
            pattern: {
              value: /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.*)?$/,
              message: 'Invalid URL format',
            },
          })}
        />
        {errors.website && (
          <p className="text-red-500 text-sm">
            {String(errors.website.message)}
          </p>
        )}
        <label className="block text-gray-700 mb-1">Category *</label>
        <select className='w-full p-2 border border-gray-300 outline-none rounded-[4px] mb-1'
          {...register('category', {
            required: 'Category is required.',
          })}
        >
          <option value="">Select Category</option>
          {
            shopCategories.map((category, idx) => (
              <option key={idx} value={category.value}>
                {category.label}
              </option>
            ))
          }
       </select>
        {errors.address && (
          <p className="text-red-500 text-sm">
            {String(errors.address.message)}
          </p>
        )} 
        <button
          type='submit'
          className='w-full text-lg bg-blue-600 text-white py-2 rounded-lg mt-4'
        >
          Create 
        </button>
      </form>
    </div>
  );
}

export default CreateShop