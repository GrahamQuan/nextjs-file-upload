import SimpleUpload from '@/components/simple-upload';

export default function Home() {
  return (
    <div className='flex flex-col items-center gap-3'>
      <h1 className='text-2xl font-bold text-sky-500'>Simple Upload</h1>
      <SimpleUpload />
    </div>
  );
}
