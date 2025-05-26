import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

// Cấu hình để Next.js không phân tích body request
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
    console.log("File upload API called");
    
    // Tạo thư mục uploads nếu chưa tồn tại
    const baseUploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(baseUploadDir)) {
      fs.mkdirSync(baseUploadDir, { recursive: true })
    }

    // Phân tích form data với formidable
    const form = new IncomingForm({
      uploadDir: baseUploadDir,
      keepExtensions: true,
      multiples: true,
    })

    // Xử lý form data
    const fileUrls = await new Promise<string[]>((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Form parse error:", err);
          reject(err)
          return
        }

        console.log("Files received:", files);
        
        // Xử lý files
        const filesArray = files.files
        if (!filesArray || filesArray.length === 0) {
          console.log("No files found in the request");
          resolve([])
          return
        }

        // Chuyển đổi thành mảng nếu chỉ có một file
        const filesArrayNormalized = Array.isArray(filesArray) ? filesArray : [filesArray]
        
        console.log(`Processing ${filesArrayNormalized.length} files`);
        
        const urls: string[] = []
        
        // Process each file
        for (const file of filesArrayNormalized) {
          try {
            // Lấy thông tin file
            const originalFilename = file.originalFilename || 'unnamed-file'
            const fileExtension = originalFilename.split('.').pop()?.toLowerCase() || ''
            
            console.log(`Processing file: ${originalFilename}, extension: ${fileExtension}`);
            
            // Tạo tên file an toàn không có timestamp
            const safeFileName = originalFilename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '')
            
            // Xác định thư mục lưu trữ dựa trên phần mở rộng file
            let uploadDir
            
            // Phân loại file dựa trên extension
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExtension)) {
              uploadDir = path.join(baseUploadDir, 'images')
            } 
            else if (fileExtension === 'pdf') {
              uploadDir = path.join(baseUploadDir, 'pdfs')
            } 
            else if (['csv', 'xls', 'xlsx', 'xlsm'].includes(fileExtension)) {
              uploadDir = path.join(baseUploadDir, 'spreadsheets')
            } 
            else if (['exe', 'msi', 'bat', 'cmd', 'dll'].includes(fileExtension)) {
              uploadDir = path.join(baseUploadDir, 'executables')
            } 
            else if (['doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf'].includes(fileExtension)) {
              uploadDir = path.join(baseUploadDir, 'documents')
            }
            else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension)) {
              uploadDir = path.join(baseUploadDir, 'archives')
            }
            else if (['js', 'html', 'css', 'java', 'py', 'php', 'c', 'cpp', 'h', 'json', 'xml'].includes(fileExtension)) {
              uploadDir = path.join(baseUploadDir, 'code')
            }
            else {
              // Fallback cho các file không xác định được
              uploadDir = path.join(baseUploadDir, 'other')
            }
            
            // Create directory if it doesn't exist
            if (!existsSync(uploadDir)) {
              console.log(`Creating directory: ${uploadDir}`);
              mkdirSync(uploadDir, { recursive: true })
            }
            
            // Move file to appropriate directory
            const targetPath = path.join(uploadDir, safeFileName)
            fs.renameSync(file.filepath, targetPath)
            
            // Lấy đường dẫn tương đối cho URL
            const subDir = uploadDir.split('uploads')[1]?.replace(/\\/g, '/') || '' // Handle Windows paths
            const publicPath = `/uploads${subDir}/${safeFileName}`
            
            console.log(`File saved at: ${publicPath}`);
            urls.push(publicPath)
          } catch (fileError) {
            console.error(`Error processing file ${file.originalFilename}:`, fileError)
            // Continue with other files
          }
        }
        
        resolve(urls)
      })
    })

    // Trả về kết quả
    console.log(`Returning ${fileUrls.length} file URLs`);
    return res.status(200).json({ 
      status: 'SUCCESS', 
      data: fileUrls
    })
  } catch (error) {
    console.error('Error handling file upload:', error)
    return res.status(500).json({ status: 'ERROR', message: 'Error handling file upload' })
  }
} 