import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'ERROR', message: 'Method not allowed' });
  }

  // Create uploads directory
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Configure formidable
  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  try {
    // Parse the form
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Process files
    const fileUrls: string[] = [];
    const filesArray = files.files;
    
    if (!filesArray) {
      return res.status(400).json({ status: 'ERROR', message: 'No files uploaded' });
    }

    // Convert to array if single file
    const filesNormalized = Array.isArray(filesArray) ? filesArray : [filesArray];
    
    for (const file of filesNormalized) {
      // Generate a unique filename
      const timestamp = Date.now();
      const originalName = file.originalFilename || 'file';
      const newFilename = `${timestamp}-${originalName}`;
      const newPath = path.join(uploadDir, newFilename);
      
      // Rename file to add timestamp
      fs.renameSync(file.filepath, newPath);
      
      // Add URL to response
      fileUrls.push(`/uploads/${newFilename}`);
    }

    // Return success response
    return res.status(200).json({
      status: 'SUCCESS',
      data: fileUrls,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: error.message || 'File upload failed',
    });
  }
} 