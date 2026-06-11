import { connectToDatabase, ObjectId } from '../lib/connectToDatabase.js';
import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';
import { authorizeAdmin } from './auth.js';

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

function parseMultipartForm(req) {
  const form = new IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      resolve([fields, files]);
    });
  });
}

function getDevelopFields(fields) {
  return {
    title: fields.title?.[0],
    shortText: fields.shortText?.[0],
    text: fields.text?.[0],
    linkText: fields.linkText?.[0]
  };
}

function uploadDevelopImage(file) {
  return cloudinary.v2.uploader.upload(file.filepath, {
    folder: 'develop',
    resource_type: 'auto',
    use_filename: true,
    width: 1350,
    format: 'webp',
    quality: 'auto:good',
    crop: 'limit',
    fetch_format: 'auto',
    flags: 'progressive'
  });
}

function destroyDevelopImage(publicId) {
  return cloudinary.v2.uploader.destroy(publicId);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function handleDevelop(req, res, dependencies = {}) {
  const connect = dependencies.connect || connectToDatabase;
  const parseForm = dependencies.parseForm || parseMultipartForm;
  const uploadImage = dependencies.uploadImage || uploadDevelopImage;
  const destroyImage = dependencies.destroyImage || destroyDevelopImage;

  // CORS Configuration
  const allowedOrigins = ['http://localhost:3000', 'https://samuelbagin.xyz'];
  const origin = req.headers.origin;

  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes(origin) ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') && !authorizeAdmin(req, res)) {
    return;
  }

  try {
    const { db } = await connect();

    if (req.method === 'GET') {
      // GET - Fetch all develop items
      const items = await db.collection('develop').find().sort({ createdAt: -1 }).toArray();
      return res.status(200).json(items);

    } else if (req.method === 'POST') {
      // POST - Create new develop item
      const [fields, files] = await parseForm(req);

      // Validate required fields
      const { title, shortText, text, linkText } = getDevelopFields(fields);

      if (!title || !shortText || !text || !linkText) {
        return res.status(400).json({
          error: 'Title, short text, text, and link text are required for develop content'
        });
      }

      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: 'Image is required for develop content' });
      }

      // Upload to Cloudinary
      const result = await uploadImage(files.image[0]);

      // Save to MongoDB
      const developDoc = {
        title,
        shortText,
        text,
        linkText,
        image: result.secure_url,
        publicId: result.public_id,
        createdAt: new Date(),
        _id: new ObjectId()
      };

      await db.collection('develop').insertOne(developDoc);
      return res.status(201).json(developDoc);

    } else if (req.method === 'PUT') {
      // PUT - Update an existing develop item
      let fields;
      let files;

      try {
        [fields, files] = await parseForm(req);
      } catch {
        return res.status(400).json({ error: 'Invalid multipart form data' });
      }

      const id = fields.id?.[0];
      const { title, shortText, text, linkText } = getDevelopFields(fields);

      if (!id || !title || !shortText || !text || !linkText) {
        return res.status(400).json({
          error: 'ID, title, short text, text, and link text are required for develop content'
        });
      }

      if (!isValidHttpUrl(linkText)) {
        return res.status(400).json({ error: 'Link text must be a valid HTTP or HTTPS URL' });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid develop item ID' });
      }

      const objectId = new ObjectId(id);
      const collection = db.collection('develop');
      const existingItem = await collection.findOne({ _id: objectId });

      if (!existingItem) {
        return res.status(404).json({ error: 'Develop item not found' });
      }

      let replacementImage = null;
      let databaseUpdated = false;

      try {
        if (files.image?.[0]) {
          replacementImage = await uploadImage(files.image[0]);
        }

        const updatedAt = new Date();
        const updatedFields = {
          title,
          shortText,
          text,
          linkText,
          updatedAt
        };

        if (replacementImage) {
          updatedFields.image = replacementImage.secure_url;
          updatedFields.publicId = replacementImage.public_id;
        }

        const updateResult = await collection.updateOne(
          { _id: objectId },
          { $set: updatedFields }
        );

        if (updateResult.matchedCount === 0) {
          if (replacementImage) {
            try {
              await destroyImage(replacementImage.public_id);
            } catch (cleanupError) {
              console.error('Replacement image cleanup error:', cleanupError);
            }
          }

          return res.status(404).json({ error: 'Develop item not found' });
        }

        databaseUpdated = true;

        const updatedItem = {
          ...existingItem,
          ...updatedFields
        };

        if (
          replacementImage
          && existingItem.publicId
          && existingItem.publicId !== replacementImage.public_id
        ) {
          try {
            await destroyImage(existingItem.publicId);
          } catch (cleanupError) {
            console.error('Previous image cleanup error:', cleanupError);
          }
        }

        return res.status(200).json(updatedItem);
      } catch (error) {
        if (replacementImage && !databaseUpdated) {
          try {
            await destroyImage(replacementImage.public_id);
          } catch (cleanupError) {
            console.error('Replacement image cleanup error:', cleanupError);
          }
        }

        throw error;
      }

    } else if (req.method === 'DELETE') {
      // DELETE - Remove develop item
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      return new Promise((resolve) => {
        req.on('end', async () => {
          try {
            const { id, publicId } = JSON.parse(body);
            console.log('Develop deletion request:', { id, publicId });

            // Validate input
            if (!id || !publicId) {
              return resolve(res.status(400).json({ error: 'Missing required fields' }));
            }

            // Convert to ObjectId
            const objectId = new ObjectId(id);

            // Delete from MongoDB
            const deleteResult = await db.collection('develop').deleteOne({
              _id: objectId,
              publicId: publicId
            });

            if (deleteResult.deletedCount === 0) {
              return resolve(res.status(404).json({ error: 'Develop item not found' }));
            }

            // Delete from Cloudinary
            const cloudResult = await destroyImage(publicId);
            console.log('Cloudinary deletion result:', cloudResult);

            return resolve(res.status(200).json({
              success: true,
              cloudinary: cloudResult
            }));

          } catch (error) {
            console.error('Delete Error:', error);
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
    console.error('Develop API Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

export default function handler(req, res) {
  return handleDevelop(req, res);
}
