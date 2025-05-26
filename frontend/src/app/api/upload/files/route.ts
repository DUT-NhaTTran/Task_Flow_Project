import { NextRequest } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return new Response(JSON.stringify({ status: 'ERROR', message: 'No file' }), { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const fileName = file.name.replace(/\s+/g, '-')
  const filePath = path.join(process.cwd(), 'public', 'uploads', fileName)

  await writeFile(filePath, buffer)

  const fileUrl = `/uploads/${fileName}`
  return new Response(JSON.stringify({ status: 'SUCCESS', data: fileUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
