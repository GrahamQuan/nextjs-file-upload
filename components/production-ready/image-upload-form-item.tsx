'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { ImageIcon, Trash2Icon } from 'lucide-react';
import { useRef } from 'react';

export default function ImageUploadFormItem({ name }: { name: string }) {
  const methods = useFormContext<{ [name: string]: File | null }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFile = methods.watch(name);

  const clearFile = () => {
    methods.setValue(name, null); // clear form
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // clear <input>
    }
  };

  const inputOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      methods.setValue(name, file);
    } else {
      methods.setValue(name, null);
    }
  };

  return (
    <div className='flex flex-col gap-5'>
      <FormField
        control={methods.control}
        name={name}
        render={() => (
          <FormItem className='relative w-full space-y-0'>
            <FormLabel className='w-[300px] rounded-xl bg-slate-600 flex-col h-[150px] cursor-pointer flex justify-center items-center hover:opacity-60'>
              <ImageIcon className='size-10' />
              <div className='text-center text-sm'>
                Drag and drop or click to upload
              </div>
            </FormLabel>
            <FormControl>
              <input
                type='file'
                ref={fileInputRef}
                accept='image/*'
                className='hidden'
                multiple={false}
                onChange={inputOnChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {currentFile && (
        <div className='relative flex justify-center items-center size-[100px] border border-sky-500'>
          <button
            type='button'
            className='absolute top-1 right-1 size-7 backdrop-blur-md rounded bg-slate-400 text-white flex items-center justify-center'
            onClick={clearFile}
          >
            <Trash2Icon className='size-5' />
          </button>
          <img
            src={URL.createObjectURL(currentFile)}
            alt='preview'
            className='object-cover max-w-full max-h-full'
          />
        </div>
      )}
    </div>
  );
}
