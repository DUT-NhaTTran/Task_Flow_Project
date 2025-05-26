import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ status: 'ERROR', message: 'No files uploaded' }), {
        status: 400,
      })
    }

    console.log(`Processing ${files.length} files`)
    
    const uploadedPaths = []
    
    // Process each file
    for (const file of files) {
      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // Lấy thông tin file
        const fileName = file.name
        const fileType = file.type
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
        
        // Tạo tên file an toàn không có timestamp
        const safeFileName = fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '')
        const finalFileName = safeFileName
        
        // Xác định thư mục lưu trữ dựa trên phần mở rộng file
        let uploadDir
        
        // Phân loại file dựa trên extension
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExtension)) {
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images')
        } 
        else if (fileExtension === 'pdf') {
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs')
        } 
        else if (['csv', 'xls', 'xlsx', 'xlsm'].includes(fileExtension)) {
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'spreadsheets')
        } 
        else if (['exe', 'msi', 'bat', 'cmd', 'dll'].includes(fileExtension)) {
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'executables')
        } 
        else if (['doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf'].includes(fileExtension)) {
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
        }
        else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension)) {
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'archives')
        }
        else if (['js', 'html', 'css', 'java', 'py', 'php', 'c', 'cpp', 'h', 'json', 'xml'].includes(fileExtension)) {
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'code')
        }
        else {
          // Fallback cho các file không xác định được
          uploadDir = path.join(process.cwd(), 'public', 'uploads', 'other')
        }
        
        // Create directory if it doesn't exist
        if (!existsSync(uploadDir)) {
          console.log(`Creating directory: ${uploadDir}`)
          await mkdir(uploadDir, { recursive: true })
        }
        
        // Save file
        const filePath = path.join(uploadDir, finalFileName)
        await writeFile(filePath, buffer)
        
        // Lấy đường dẫn tương đối cho URL
        const subDir = uploadDir.split('uploads')[1].replace(/\\/g, '/') // Handle Windows paths
        const publicPath = `/uploads${subDir}/${finalFileName}`
        
        uploadedPaths.push(publicPath)
        console.log(`File saved: ${publicPath} (Type: ${fileType}, Extension: ${fileExtension})`)
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError)
        // Continue with other files
      }
    }

    if (uploadedPaths.length === 0) {
      return new Response(JSON.stringify({ status: 'ERROR', message: 'Failed to upload files' }), {
        status: 500,
      })
    }

    return new Response(JSON.stringify({ 
      status: 'SUCCESS', 
      data: uploadedPaths 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return new Response(JSON.stringify({ status: 'ERROR', message: error.message }), {
      status: 500,
    })
  }
}
