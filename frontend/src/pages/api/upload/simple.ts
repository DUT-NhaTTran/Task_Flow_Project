import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

// Configure Next.js to not parse request body
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'ERROR', message: 'Method not allowed' })
  }

  try {
    console.log("Simple file upload API called");
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    // Parse form data with formidable
    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      multiples: true,
    })

    // Process form data
    const fileUrls = await new Promise<string[]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Form parse error:", err);
          reject(err);
          return;
        }

        console.log("Files received:", Object.keys(files));
        
        // Get files array
        const filesArray = files.files;
        if (!filesArray) {
          console.log("No files found in the request");
          resolve([]);
          return;
        }

        // Convert to array if only one file
        const filesNormalized = Array.isArray(filesArray) ? filesArray : [filesArray];
        
        console.log(`Processing ${filesNormalized.length} files`);
        
        const urls: string[] = [];
        
        // Process each file
        filesNormalized.forEach(file => {
          try {
            const originalFilename = file.originalFilename || 'unnamed-file';
            const safeFileName = Date.now() + '-' + originalFilename.replace(/\s+/g, '-');
            const finalPath = path.join(uploadDir, safeFileName);
            
            // Move file from temp location to final location
            fs.renameSync(file.filepath, finalPath);
            
            // Create URL for file
            const publicUrl = `/uploads/${safeFileName}`;
            urls.push(publicUrl);
            
            console.log(`File saved: ${publicUrl}`);
          } catch (fileError) {
            console.error(`Error processing file:`, fileError);
          }
        });
        
        resolve(urls);
      });
    }).catch(error => {
      console.error("Promise error:", error);
      return [];
    });

    // Return result
    console.log(`Returning ${fileUrls.length} file URLs`);
    return res.status(200).json({ 
      status: 'SUCCESS', 
      data: fileUrls
    });
  } catch (error: any) {
    console.error('Error handling file upload:', error);
    return res.status(500).json({ 
      status: 'ERROR', 
      message: error.message || 'Error handling file upload'
    });
  }
} 