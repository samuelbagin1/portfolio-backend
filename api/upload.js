import { IncomingForm } from 'formidable';
import cloudinary from 'cloudinary';
import streamifier from 'streamifier';
import { connectToDatabase } from '../lib/mongodb';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const form = new IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: err.message });

      try {
        const { db } = await connectToDatabase();
        const stream = cloudinary.v2.uploader.upload_stream(
          { folder: 'portfolio' },
          async (error, result) => {
            if (error) return res.status(500).json({ error: error.message });
            const image = { text: fields.text, photo: result.secure_url };
            await db.collection('images').insertOne(image);
            res.status(201).json(image);
          }
        );
        streamifier.createReadStream(files.photo.path).pipe(stream);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}