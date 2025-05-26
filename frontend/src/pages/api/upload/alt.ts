import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// This API route uses a different approach for file uploads
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'ERROR', message: 'Method not allowed' });
  }

  try {
    // For this simplified version, we'll return mock URLs
    // In a real implementation, you would process the files from req.body
    
    // Create a timestamp for unique filenames
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    
    // Generate random file URLs for testing
    const mockFileUrls = [
      `/uploads/${timestamp}-${randomId}-test-image.jpg`,
      `/uploads/${timestamp}-${randomId + 1}-test-document.pdf`,
    ];
    
    // In a real implementation, you would save the files to disk
    // and return the actual URLs
    
    // Return success response with mock URLs
    return res.status(200).json({
      status: 'SUCCESS',
      data: mockFileUrls,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      status: 'ERROR',
      message: error.message || 'File upload failed',
    });
  }
} 