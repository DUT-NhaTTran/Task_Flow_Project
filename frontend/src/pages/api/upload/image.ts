import type { NextApiRequest, NextApiResponse } from 'next'
import { IncomingForm } from 'formidable'
import fs from 'fs'
import path from 'path'

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
    // Tạo thư mục uploads nếu chưa tồn tại
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Phân tích form data với formidable
    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
    })

    // Xử lý form data
    const imageUrl = await new Promise<string>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err)
          return
        }

        // Xử lý file ảnh
        const imageFile = files.image
        if (!imageFile) {
          reject(new Error('No image file provided'))
          return
        }

        // Trong môi trường thực tế, bạn sẽ lưu file và trả về URL thực
        // Ở đây chúng ta chỉ trả về URL giả định
        resolve(`https://picsum.photos/800/400?random=${Math.random()}`)
      })
    })

    // Trả về kết quả
    return res.status(200).json({ 
      status: 'SUCCESS', 
      data: imageUrl
    })
  } catch (error) {
    console.error('Error handling image upload:', error)
    return res.status(500).json({ status: 'ERROR', message: 'Error handling image upload' })
  }
} 