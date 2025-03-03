import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

const BucketClient = new S3Client({
  region: process.env.BUCKET_REGION,
  endpoint: process.env.BUCKET_ENDPOINT,
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY || '',
  },
});

export default BucketClient;
