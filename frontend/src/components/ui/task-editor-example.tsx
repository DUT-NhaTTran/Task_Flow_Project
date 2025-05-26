import { useState } from 'react';
import TiptapEditor from './tiptap-editor';

interface TaskEditorExampleProps {
  taskId: string;
  initialContent?: string;
}

export default function TaskEditorExample({ taskId, initialContent = '' }: TaskEditorExampleProps) {
  const [content, setContent] = useState(initialContent);
  const [attachments, setAttachments] = useState<any[]>([]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // Ở đây bạn có thể gọi API để lưu content vào database
    console.log('Task content updated:', newContent);
  };

  const handleAttachmentUpload = (newAttachments: any[]) => {
    // Add new attachments to the list
    setAttachments(prev => [...prev, ...newAttachments]);
    console.log('New attachments uploaded:', newAttachments);
    
    // Here you can also call API to update task with attachments
    // Example: updateTaskAttachments(taskId, [...attachments, ...newAttachments]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Task Editor</h2>
        <p className="text-gray-600">Task ID: {taskId}</p>
        <p className="text-gray-600">Attachments: {attachments.length}</p>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <TiptapEditor
          content={content}
          onChange={handleContentChange}
          taskId={taskId}
          onAttachmentUpload={handleAttachmentUpload}
        />
      </div>

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-medium mb-2">Current Content (HTML):</h3>
        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
          {content || '<empty>'}
        </pre>
      </div>

      {/* Display current attachments */}
      {attachments.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Attachments ({attachments.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {attachments.map((attachment, index) => (
              <div key={attachment.id || index} className="border rounded p-3 bg-gray-50">
                <p className="text-sm font-medium truncate">{attachment.fileName || attachment.file_name}</p>
                <p className="text-xs text-gray-500">{attachment.fileType || attachment.file_type}</p>
                <p className="text-xs text-gray-400">
                  {attachment.uploadedAt || attachment.uploaded_at ? 
                    new Date(attachment.uploadedAt || attachment.uploaded_at).toLocaleString() : 
                    'Just uploaded'
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Example usage:
// <TaskEditorExample taskId="550e8400-e29b-41d4-a716-446655440000" /> 