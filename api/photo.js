import { connectToDatabase, ObjectId } from '../lib/connectToDatabase.js';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 15
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async (req, res) => {
  // CORS Configuration
  const allowedOrigins = ['http://localhost:3000', 'https://head.samuelbagin.xyz', 'https://samuelbagin.xyz'];
  const origin = req.headers.origin;

  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      // GET - Fetch all images
      const images = await db.collection('images').find().toArray();
      return res.status(200).json(images);

    } else if (req.method === 'POST') {
      // POST - Upload new image
      const form = new IncomingForm();

      // Parse form data
      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      });

      // Validate file upload
      if (!files.photo || !files.photo[0]) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = files.photo[0];

      // Upload to Cloudinary using buffer
      const result = await cloudinary.v2.uploader.upload(file.filepath, {
        folder: 'test',
        resource_type: 'auto',
        use_filename: true,
        width: 1350,              // Resize to 1350px width
        format: 'webp',           // Convert to WebP format
        quality: 'auto:good',     // Automatic quality optimization
        crop: 'limit',            // Only resize if larger (won't upscale)
        fetch_format: 'auto',     // Best format for browser
        flags: 'progressive'      // Progressive loading
      });

      // Save to MongoDB
      const imageDoc = {
        text: fields.text[0],
        photo: result.secure_url,
        createdAt: new Date(),
        publicId: result.public_id, // Make sure this is stored
        _id: new ObjectId() // Explicit ID creation
      };

      await db.collection('images').insertOne(imageDoc);
      return res.status(201).json(imageDoc);

    } else if (req.method === 'DELETE') {
      // DELETE - Remove image
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      return new Promise((resolve) => {
        req.on('end', async () => {
          try {
            const { id, publicId } = JSON.parse(body);
            console.log('Deletion request:', { id, publicId });

            // Validate input
            if (!id || !publicId) {
              return resolve(res.status(400).json({ error: 'Missing required fields' }));
            }

            // Convert to ObjectId
            const objectId = new ObjectId(id);

            // 1. Delete from MongoDB
            const deleteResult = await db.collection('images').deleteOne({
              _id: objectId,
              publicId: publicId
            });

            if (deleteResult.deletedCount === 0) {
              return resolve(res.status(404).json({ error: 'Image not found' }));
            }

            // 2. Delete from Cloudinary
            const cloudResult = await cloudinary.v2.uploader.destroy(publicId);
            console.log('Cloudinary deletion result:', cloudResult);

            return resolve(res.status(200).json({
              success: true,
              cloudinary: cloudResult
            }));

          } catch (error) {
            console.error('Delete Error:', {
              error: error.message,
              stack: error.stack,
              body: body
            });
            return resolve(res.status(500).json({
              error: error.message || 'Internal server error',
              details: error.stack
            }));
          }
        });
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Images API Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
};