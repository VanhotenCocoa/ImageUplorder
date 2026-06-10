import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const requiredEnv = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
const missingEnv = requiredEnv.filter(name => !process.env[name]);

if (missingEnv.length) {
  console.error('Missing required env vars:', missingEnv.join(', '));
}

const s3 = new S3Client({ region: process.env.AWS_REGION });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (missingEnv.length) {
    return res.status(500).json({ error: `Missing required env vars: ${missingEnv.join(', ')}` });
  }
  try {
    const command = new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME });
    const data = await s3.send(command);
    const items = (data.Contents || []).map(obj => ({
      key: obj.Key,
      url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURIComponent(obj.Key)}`
    }));
    res.json(items.reverse());
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ error: `failed to list objects: ${err.message}` });
  }
};
