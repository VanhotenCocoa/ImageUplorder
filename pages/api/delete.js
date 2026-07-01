import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const DELETE_PASSWORD = 'Sakujo';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { keys, password } = req.body;

  if (password !== DELETE_PASSWORD) {
    return res.status(401).json({ error: 'パスワードが違います' });
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ error: 'keys required' });
  }

  try {
    await s3.send(new DeleteObjectsCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Delete: { Objects: keys.map(key => ({ Key: key })) },
    }));
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
}
