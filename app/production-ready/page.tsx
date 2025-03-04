import SubmitForm from '@/components/production-ready/submit-form';

const TechStack = [
  'nextjs v15.2',
  'react v19',
  'typescript',
  'zod',
  'shadcn ui',
  'tailwindcss v4',
  'react-hook-form',
  'react-dropzone',
  'R2 Bucket (S3 Compatible)',
  'Presigned Url',
];

const Features = [
  'Drag and drop file upload',
  'File size limit',
  'File type validation',
  'Progressive file upload',
  'Cancel file upload',
  'Reupload when upload slice failed (max 3 times)',
];

export default function Page() {
  return (
    <div className='flex flex-col gap-5 items-center'>
      <h1 className='text-2xl font-bold'>Production Ready File Upload</h1>
      <div className='flex gap-10'>
        <div className='space-y-10'>
          <div>
            <h2 className='text-lg font-bold'>Tech stack</h2>
            <ul className='list-disc flex flex-col gap-1'>
              {TechStack.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className='text-lg font-bold'>Features</h2>
            <ul className='list-disc flex flex-col gap-1'>
              {Features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
        <SubmitForm />
      </div>
    </div>
  );
}
