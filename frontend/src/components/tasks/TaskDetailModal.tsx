import { useState, useEffect, useMemo, forwardRef, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/drop-down";
import axios from "axios";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DropdownMenu } from '@/components/ui/DropdownMenu';

// Import TipTap editor component dynamically to avoid SSR issues
const TiptapEditor = dynamic(() => import("@/components/ui/tiptap-editor"), {
  ssr: false,
  loading: () => (
    <div className="border rounded p-3 min-h-[250px] bg-gray-50">
      Loading editor...
    </div>
  ),
});

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  storyPoint?: number;
  assigneeId?: string | null;
  assigneeName?: string;
  shortKey?: string;
  projectId?: string;
  sprintId?: string;
  dueDate?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  parentTaskId?: string | null;
  tags?: string[] | null;
  labels?: string[];
  label?: string;
  attachments?: Array<string | Attachment>;
}

// Define the Attachment interface to match the database structure
interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  uploaded_at?: string;
}

export interface SprintOption {
  id: string;
  name: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  avatar?: string;
}

interface TaskDetailModalProps {
  task: TaskData;
  onClose: () => void;
  onUpdate: (updatedTask: TaskData) => void;
  sprints?: SprintOption[];
}

export default function TaskDetailModal({
  task,
  onClose,
  onUpdate,
  sprints = [],
}: TaskDetailModalProps) {
  // State for editing the task
  const [editedTask, setEditedTask] = useState<TaskData>({ ...task });
  
  // Update local state when task prop changes
  useEffect(() => {
    console.log("Task prop changed:", task);
    setEditedTask({ ...task });
  }, [task]);
  
  // State for saving/loading
  const [isSaving, setIsSaving] = useState(false);
  // State for edit mode - default to false (read-only)
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // State for comment
  const [comment, setComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  
  // Reply functionality state
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isAddingReply, setIsAddingReply] = useState(false);

  // State for users in the project
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // State for current user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  // State for UI interaction
  const [activeTab, setActiveTab] = useState<
    "all" | "comments" | "history" | "worklog"
  >("comments");
  const [isWatchingTask, setIsWatchingTask] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Comment interface to match backend
  interface CommentData {
    id: number;
    taskId: string;
    userId: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    parentCommentId?: number;
    isDeleted: boolean;
    replies?: CommentData[];
  }

  // Update task field
  const updateField = (field: keyof TaskData, value: any) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
  };

  // Utility function to extract only text from HTML content
  const extractTextFromHtml = (htmlContent: string): string => {
    if (!htmlContent) return "";
    
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Remove ONLY file links (NOT images)
    // Images should stay in description content
    // Only file links should be moved to attachments table
    const fileLinks = tempDiv.querySelectorAll('a[href*="/uploads/"], a.file-link, a[data-attachment-id]');
    fileLinks.forEach(link => link.remove());
    
    // Keep images in description content
    // Images will also have copies in attachments table for management
    
    // Get content with images preserved
    let contentWithImages = tempDiv.innerHTML;
    
    // Clean up extra line breaks and empty paragraphs
    contentWithImages = contentWithImages
      .replace(/<p><br><\/p>/g, '<p></p>') // Remove empty paragraphs with br
      .replace(/<p>\s*<\/p>/g, '') // Remove completely empty paragraphs
      .replace(/(<p><\/p>){2,}/g, '<p></p>') // Replace multiple empty paragraphs with single
      .trim();
    
    console.log("Original HTML:", htmlContent);
    console.log("Content with images preserved (files removed):", contentWithImages);
    
    return contentWithImages;
  };

  // Extract and save attachments from description content to attachments table
  const extractAndSaveAttachmentsFromDescription = async (htmlContent: string): Promise<void> => {
    if (!htmlContent || !editedTask.id) return;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Extract images
    const images = tempDiv.querySelectorAll('img');
    const imagePromises: Promise<any>[] = [];
    
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && (src.startsWith('/uploads/') || src.startsWith('http'))) {
        // For images that are already uploaded files, create attachment record
        const fileName = src.split('/').pop() || 'image';
        const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpeg';
        
        const attachmentData = {
          taskId: editedTask.id,
          fileName: fileName,
          fileUrl: src,
          fileType: `image/${fileType}`
        };
        
        // Save to attachments table
        const promise = axios.post('http://localhost:8087/api/attachments/create', attachmentData)
          .then(response => {
            if (response.data?.status === "SUCCESS") {
              console.log("Image saved to attachments table:", response.data.data);
              return response.data.data;
            }
          })
          .catch(error => {
            console.error("Error saving image to attachments table:", error);
          });
        
        imagePromises.push(promise);
      }
    });
    
    // Extract file links
    const fileLinks = tempDiv.querySelectorAll('a[href*="/uploads/"], a.file-link');
    const fileLinkPromises: Promise<any>[] = [];
    
    fileLinks.forEach(link => {
      const href = link.getAttribute('href');
      const fileName = link.textContent?.replace(/^[📊📝📄📎]\s*/, '') || 'file'; // Remove emoji icons
      
      if (href && href.startsWith('/uploads/')) {
        const fileType = fileName.split('.').pop()?.toLowerCase() || 'unknown';
        
        const attachmentData = {
          taskId: editedTask.id,
          fileName: fileName,
          fileUrl: href,
          fileType: fileType
        };
        
        // Save to attachments table
        const promise = axios.post('http://localhost:8087/api/attachments/create', attachmentData)
          .then(response => {
            if (response.data?.status === "SUCCESS") {
              console.log("File saved to attachments table:", response.data.data);
              return response.data.data;
            }
          })
          .catch(error => {
            console.error("Error saving file to attachments table:", error);
          });
        
        fileLinkPromises.push(promise);
      }
    });
    
    // Wait for all attachments to be saved
    const allPromises = [...imagePromises, ...fileLinkPromises];
    if (allPromises.length > 0) {
      try {
        const savedAttachments = await Promise.all(allPromises);
        const validAttachments = savedAttachments.filter(Boolean);
        
        if (validAttachments.length > 0) {
          // Update local UI state with the saved attachments
          const currentAttachments = editedTask.attachments || [];
          const updatedAttachments = [...currentAttachments, ...validAttachments];
          updateField("attachments", updatedAttachments);
          
          toast.success(`Moved ${validAttachments.length} file(s) to attachments table`, {
            duration: 3000,
          });
          
          console.log("Successfully moved files from description to attachments table");
        }
      } catch (error) {
        console.error("Error saving attachments:", error);
        toast.error("Some files could not be moved to attachments table");
      }
    }
  };

  // Fetch users by project ID when the component mounts or when projectId changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (!editedTask.projectId) {
        console.log("No projectId available, cannot fetch users");
        return;
      }

      try {
        setLoadingUsers(true);
        console.log("Fetching users for project:", editedTask.projectId);

        const response = await axios.get(
          `http://localhost:8086/api/users/project/${editedTask.projectId}`
        );

        if (response.data?.status === "SUCCESS") {
          const fetchedUsers = response.data.data || [];
          console.log("Users fetched:", fetchedUsers);
          setUsers(fetchedUsers);
        } else {
          console.error("Failed to fetch users:", response.data);
          toast.error("Could not load project users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load project users");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [editedTask.projectId]);

  // Fetch current user from localStorage when the component mounts
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const currentUserId = localStorage.getItem("ownerId");
        console.log("Trying to get current user with ownerId:", currentUserId);

        if (!currentUserId) {
          console.log(
            "No user ID found in localStorage, trying to fetch from project"
          );

          // Try to fetch user from project if currentUserId is not available
          if (editedTask.projectId) {
            try {
              const projectResponse = await axios.get(
                `http://localhost:8086/api/users/project/${editedTask.projectId}`
              );
              if (
                projectResponse.data?.status === "SUCCESS" &&
                projectResponse.data.data?.length > 0
              ) {
                setCurrentUser(projectResponse.data.data[0]);
                console.log(
                  "Set current user from project:",
                  projectResponse.data.data[0]
                );
                setIsUserLoading(false);
                return;
              }
            } catch (projectError) {
              console.error("Error fetching users from project:", projectError);
            }
          }

          // If no user found in project, try fetching from token
          const token = localStorage.getItem("token");
          if (token) {
            try {
              const userResponse = await axios.get(
                `http://localhost:8080/api/auth/me`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (userResponse.data && userResponse.data.userId) {
                const detailResponse = await axios.get(
                  `http://localhost:8086/api/users/${userResponse.data.userId}`
                );
                if (detailResponse.data?.status === "SUCCESS") {
                  setCurrentUser(detailResponse.data.data);
                  console.log(
                    "Set current user from token:",
                    detailResponse.data.data
                  );
                  setIsUserLoading(false);
                  return;
                }
              }
            } catch (tokenError) {
              console.error("Error fetching user from token:", tokenError);
            }
          }

          console.error("Failed to get user information from all sources");
          setIsUserLoading(false);
          return;
        }

        // Fetch user details with the correct userId
        const response = await axios.get(
          `http://localhost:8080/api/auth/${currentUserId}/user-id`
        );

        if (response.data && response.data.userId) {
          const userResponse = await axios.get(
            `http://localhost:8086/api/users/${response.data.userId}`
          );
          if (userResponse.data?.data) {
            setCurrentUser(userResponse.data.data);
            console.log("Set current user to:", userResponse.data.data);
          }
        }
        setIsUserLoading(false);
      } catch (error) {
        console.error("Error in fetchCurrentUser:", error);
        setIsUserLoading(false);
      }
    };

    fetchCurrentUser();
  }, [editedTask.projectId]);

  // Toggle description edit mode
  const toggleDescriptionEditMode = () => {
    // If we're currently editing and switching to view mode, save the changes
    if (isEditingDescription) {
      saveChanges();
    }
    setIsEditingDescription(!isEditingDescription);
  };

  // Handle file upload for attachments
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    toast.loading("Uploading files to attachments table...", { id: "file-upload" });
    
    try {
      // Array to store uploaded files
      const uploadedAttachments = [];
      
      // Process each file - files will be saved to attachments table via File-Service
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create FormData to send the file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('taskId', editedTask.id);
        
        try {
          console.log(`Uploading file: ${file.name} to attachments table for task: ${editedTask.id}`);
          // Upload the file to the dedicated File Service - saves to attachments table
          const response = await axios.post('http://localhost:8087/api/attachments/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          if (response.data?.status === "SUCCESS" && response.data.data) {
            // Add the attachment object returned from the server (from attachments table)
            uploadedAttachments.push(response.data.data);
            console.log("File uploaded successfully to attachments table:", response.data.data);
          } else {
            console.error("Failed to upload file to attachments table:", file.name, response.data);
            toast.error(`Failed to upload ${file.name}`);
          }
        } catch (uploadError) {
          console.error("Error uploading file to attachments table:", uploadError);
          toast.error(`Error uploading ${file.name}`);
        }
      }
      
      if (uploadedAttachments.length > 0) {
        // Add new attachments to the local task state (for UI display)
        // Note: These are NOT saved to task table, only displayed locally
        const currentAttachments = editedTask.attachments || [];
        const updatedAttachments = [...currentAttachments, ...uploadedAttachments];
        
        // Update local state for UI display
        updateField("attachments", updatedAttachments);
        
        // Count different file types for the success message
        const imageCount = uploadedAttachments.filter(att => {
          const fileType = att.fileType || att.file_type || '';
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileType.toLowerCase());
        }).length;
        const otherCount = uploadedAttachments.length - imageCount;
        
        // Display success message
        toast.success(`Saved to attachments table: ${imageCount} image(s), ${otherCount} other file(s)`, {
          id: "file-upload",
          duration: 3000,
        });
        
        // Scroll to the attachments section
        setTimeout(() => {
          const attachmentsSection = document.querySelector('.task-attachments-section');
          if (attachmentsSection) {
            attachmentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
        
        console.log("Files uploaded successfully to attachments table. No need to save task.");
      } else {
        toast.error("No files were uploaded successfully", { id: "file-upload" });
      }
    } catch (error) {
      console.error("Error processing files for attachments table:", error);
      toast.error("Error processing files", { id: "file-upload" });
    }
  };

  // Handle attachment upload from TiptapEditor (already saved to attachments table)
  const handleTiptapAttachmentUpload = (newAttachments: any[]) => {
    // These attachments were already uploaded to attachments table by TiptapEditor
    // We just need to update the local UI state to display them
    const currentAttachments = editedTask.attachments || [];
    
    // Filter out duplicates based on attachment ID
    const uniqueNewAttachments = newAttachments.filter(newAtt => 
      !currentAttachments.some(currentAtt => 
        (typeof currentAtt === 'object' && currentAtt.id === newAtt.id)
      )
    );
    
    if (uniqueNewAttachments.length > 0) {
      const updatedAttachments = [...currentAttachments, ...uniqueNewAttachments];
      
      console.log('Adding attachments to UI (already saved to attachments table):', uniqueNewAttachments);
      console.log('Updated attachments array for UI:', updatedAttachments);
      
      // Update local UI state only (attachments already in database)
      updateField("attachments", updatedAttachments);
      
      // Show notification about new attachments
      toast.success(`Added ${uniqueNewAttachments.length} attachment(s) to UI (already in database)`, {
        duration: 3000,
      });
      
      console.log("Attachments are already saved to attachments table. No need to save task.");
    }
  };

  // Save changes to task
  const saveChanges = async () => {
    try {
      setIsSaving(true);
      console.log("Starting save process for task:", editedTask);

      // Step 1: Extract and save attachments from description to attachments table
      if (editedTask.description) {
        console.log("Extracting attachments from description...");
        await extractAndSaveAttachmentsFromDescription(editedTask.description);
      }

      // Step 2: Extract only text content from description (remove images and file links)
      const textOnlyDescription = extractTextFromHtml(editedTask.description || "");
      
      // Create task object WITHOUT attachments (attachments are stored separately in attachments table)
      const taskToSave = { 
        ...editedTask,
        description: textOnlyDescription // Save only text content to description field
      };
      delete taskToSave.attachments; // Remove attachments from task object
      
      console.log("Task data to save (text-only description, without attachments):", taskToSave);
      
      // Step 3: Save task with text-only description to Tasks-Service
      const response = await axios.put(
        `http://localhost:8085/api/tasks/${taskToSave.id}`,
        taskToSave
      );

      if (response.data?.status === "SUCCESS") {
        toast.success("Task updated successfully - images preserved in description, files moved to attachments");
        
        // Update the task in the UI with the updated data (but keep attachments in local state)
        const updatedTaskWithAttachments = { 
          ...taskToSave, 
          attachments: editedTask.attachments,
          description: textOnlyDescription // Update local state with clean description
        };
        onUpdate(updatedTaskWithAttachments);
        
        // Exit edit mode after saving
        setIsEditingDescription(false);
        
        console.log("Task saved successfully - images in description, files in attachments table.");
        
        // Close modal after successful save
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        toast.error("Failed to update task");
        console.error("API returned error:", response.data);
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  // Remove attachment from attachments table
  const removeAttachment = async (index: number) => {
    try {
      // Get the attachment to remove
      const attachmentToRemove = editedTask.attachments?.[index];
      if (!attachmentToRemove) return;
      
      // Get a copy of current attachments for local UI state
      const newAttachments = [...(editedTask.attachments || [])];
      
      // Check if it's a database attachment (object with id) or just a URL string
      if (typeof attachmentToRemove === 'object' && attachmentToRemove.id) {
        // If it has an ID and it's not a temporary ID, delete from the attachments table
        if (!attachmentToRemove.id.toString().startsWith('temp-')) {
          try {
            console.log(`Deleting attachment ${attachmentToRemove.id} from attachments table`);
            const response = await axios.delete(`http://localhost:8087/api/attachments/${attachmentToRemove.id}`);
            if (response.data?.status === "SUCCESS") {
              console.log("Attachment deleted from attachments table successfully");
              toast.success("Attachment deleted from database");
            } else {
              console.error("Failed to delete attachment from attachments table:", response.data);
              toast.error("Failed to delete attachment from database");
              return; // Don't remove from UI if database deletion failed
            }
          } catch (deleteError) {
            console.error("Error deleting attachment from attachments table:", deleteError);
            toast.error("Error deleting attachment from database");
            return; // Don't remove from UI if database deletion failed
          }
        }
      }
      
      // Remove from the local UI state only if database deletion succeeded
      newAttachments.splice(index, 1);
      
      // Update the local UI state (not saved to task table)
      updateField("attachments", newAttachments);
      
      // Show success message
      toast.success("Attachment removed from UI");
      
      console.log("Attachment deleted from attachments table and removed from UI. Task table not affected.");
      console.log("Remaining attachments in UI:", newAttachments);
    } catch (error) {
      console.error("Error removing attachment:", error);
      toast.error("Failed to remove attachment");
    }
  };

  // Assign task to the current user
  const assignToMe = () => {
    if (!currentUser) {
      toast.error("Current user information is not available.");
      console.error("Cannot assign task - currentUser is null or undefined");
      return;
    }

    console.log("Assigning task to me, current user:", currentUser);
    updateField("assigneeId", currentUser.id);
    updateField("assigneeName", currentUser.username);

    // Log the updated task to check changes
    setTimeout(() => {
      console.log("Updated task after assignment:", editedTask);
    }, 0);
  };

  // Add URL as attachment
  const addUrlAttachment = () => {
    // Sử dụng hộp thoại nhập liệu với giao diện tốt hơn
    try {
      // Tạo một phần tử dialog giả lập
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50';
      dialog.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl p-6 w-[400px]">
          <h3 class="text-lg font-medium mb-4">Add URL attachment</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">URL</label>
            <input type="text" id="attachment-url-input" class="w-full border rounded px-3 py-2" placeholder="https://example.com/file.pdf">
            <div id="url-validation-error" class="text-red-500 text-sm mt-1 hidden">Please enter a valid URL</div>
          </div>
          <div class="flex justify-end gap-2">
            <button id="cancel-url-button" class="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button id="add-url-button" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Xử lý sự kiện cho các nút
      const input = dialog.querySelector('#attachment-url-input') as HTMLInputElement;
      const errorDiv = dialog.querySelector('#url-validation-error') as HTMLDivElement;
      const addButton = dialog.querySelector('#add-url-button') as HTMLButtonElement;
      const cancelButton = dialog.querySelector('#cancel-url-button') as HTMLButtonElement;
      
      // Focus vào ô nhập liệu
      setTimeout(() => input?.focus(), 100);
      
      // Xử lý sự kiện khi click nút Add
      addButton.onclick = () => {
        const url = input.value.trim();
        if (!url) {
          errorDiv.textContent = "URL cannot be empty";
          errorDiv.classList.remove('hidden');
          return;
        }
        
        try {
          new URL(url); // Kiểm tra URL hợp lệ
          
          // Thêm URL vào danh sách đính kèm
          const currentAttachments = editedTask.attachments || [];
          updateField("attachments", [...currentAttachments, url]);
          
          // Hiển thị thông báo thành công
          const displayUrl = url.length > 30 ? url.substring(0, 30) + '...' : url;
          toast.success(`Added link: ${displayUrl}`, {
            duration: 3000,
          });
          
          // Auto-save the task after adding URL
          saveChanges();
          
          // Đóng dialog
          document.body.removeChild(dialog);
        } catch (error) {
          errorDiv.textContent = "Please enter a valid URL";
          errorDiv.classList.remove('hidden');
        }
      };
      
      // Xử lý sự kiện khi click nút Cancel
      cancelButton.onclick = () => {
        document.body.removeChild(dialog);
      };
      
      // Xử lý sự kiện khi nhấn Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          addButton.click();
        }
      });
      
      // Xử lý sự kiện khi nhấn Escape
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
          document.body.removeChild(dialog);
          document.removeEventListener('keydown', escHandler);
        }
      });
      
    } catch (error) {
      console.error("Error showing URL dialog:", error);
      toast.error("Failed to add URL attachment");
    }
  };

  // Toggle watch status
  const toggleWatch = () => {
    setIsWatchingTask((prev) => !prev);
    toast.success(
      isWatchingTask ? "No longer watching this task" : "Now watching this task"
    );
  };

  // Toggle like status
  const toggleLike = () => {
    setIsLiked((prev) => !prev);
    toast.success(isLiked ? "Removed your like" : "You liked this task");
  };

  // Add comment
  const addComment = async () => {
    if (!comment.trim() || !currentUser || !editedTask.id) {
      toast.error("Please enter a comment and ensure you're logged in");
      return;
    }

    try {
      setIsAddingComment(true);
      
      const commentData = {
        taskId: editedTask.id,
        userId: currentUser.id,
        content: comment.trim()
      };

      console.log("Adding comment:", commentData);

      const response = await axios.post(
        "http://localhost:8085/api/comments",
        commentData
      );

      if (response.data?.status === "SUCCESS") {
        // Add the new comment to local state
        const newComment = response.data.data;
        // Ensure the comment has current timestamp for "Just now" display
        newComment.createdAt = new Date().toISOString();
        newComment.updatedAt = new Date().toISOString();
        
        setComments((prev) => [...prev, newComment]);
        setComment("");
        toast.success("Comment added successfully");
        console.log("Comment added:", newComment);
      } else {
        toast.error("Failed to add comment");
        console.error("API returned error:", response.data);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };

  // Add reply to comment
  const addReply = async (parentCommentId: number) => {
    if (!replyText.trim() || !currentUser || !editedTask.id) {
      toast.error("Please enter a reply and ensure you're logged in");
      return;
    }

    try {
      setIsAddingReply(true);
      
      const replyData = {
        userId: currentUser.id,
        content: replyText.trim()
      };

      console.log("Adding reply to comment:", parentCommentId, replyData);

      const response = await axios.post(
        `http://localhost:8085/api/comments/${parentCommentId}/reply`,
        replyData
      );

      if (response.data?.status === "SUCCESS") {
        // Add the new reply to local state
        const newReply = response.data.data;
        // Ensure the reply has current timestamp for "Just now" display
        newReply.createdAt = new Date().toISOString();
        newReply.updatedAt = new Date().toISOString();
        
        setComments((prev) => [...prev, newReply]);
        setReplyText("");
        setReplyingTo(null);
        toast.success("Reply added successfully");
        console.log("Reply added:", newReply);
      } else {
        toast.error("Failed to add reply");
        console.error("API returned error:", response.data);
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    } finally {
      setIsAddingReply(false);
    }
  };

  // Fetch comments for the task
  const fetchComments = async (taskId: string) => {
    if (!taskId) return;

    try {
      setIsLoadingComments(true);
      console.log("Fetching comments for task:", taskId);

      const response = await axios.get(
        `http://localhost:8085/api/comments/task/${taskId}`
      );

      if (response.data?.status === "SUCCESS") {
        const fetchedComments = response.data.data || [];
        setComments(fetchedComments);
        console.log("Comments fetched:", fetchedComments);
      } else {
        console.error("Failed to fetch comments:", response.data);
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Delete comment
  const deleteComment = async (commentId: number) => {
    if (!currentUser) {
      toast.error("You must be logged in to delete comments");
      return;
    }

    try {
      console.log(`Deleting comment ${commentId} for user ${currentUser.id}`);

      const response = await axios.delete(
        `http://localhost:8085/api/comments/${commentId}?userId=${currentUser.id}`
      );

      if (response.data?.status === "SUCCESS") {
        // Remove the comment from local state
        setComments((prev) => prev.filter(c => c.id !== commentId));
        toast.success("Comment deleted successfully");
        console.log("Comment deleted successfully");
      } else {
        toast.error("Failed to delete comment");
        console.error("API returned error:", response.data);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Format comment date
  const formatCommentDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes} minute(s) ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour(s) ago`;
      if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} day(s) ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Map status values to display names
  const statusMap: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    REVIEW: "Review",
    DONE: "Done",
  };

  // Status options for dropdown
  const statusOptions = Object.values(statusMap);

  // Handle status change from dropdown
  const handleStatusChange = (displayValue: string) => {
    const statusKey = Object.keys(statusMap).find(
      (key) => statusMap[key] === displayValue
    );

    if (statusKey) {
      updateField("status", statusKey);
    }
  };

  // Handle assignee change
  const handleAssigneeChange = (displayValue: string) => {
    if (displayValue === "Unassigned" || displayValue === "Loading...") {
      updateField("assigneeId", null);
      updateField("assigneeName", "");
      return;
    }

    const selectedUser = users.find((user) => user.username === displayValue);
    if (selectedUser) {
      console.log("Selected user:", selectedUser);
      updateField("assigneeId", selectedUser.id);
      updateField("assigneeName", selectedUser.username);
    } else {
      console.error("User not found for username:", displayValue);
      if (displayValue && displayValue !== "Unassigned") {
        updateField("assigneeName", displayValue);
      }
    }
  };

  // Handle sprint change
  const handleSprintChange = (displayValue: string) => {
    if (displayValue === "None") {
      updateField("sprintId", "");
    } else {
      const sprint = sprints.find((s) => s.name === displayValue);
      if (sprint) {
        updateField("sprintId", sprint.id);
      }
    }
  };

  // Prepare user options for dropdown
  const userOptions = loadingUsers
    ? ["Loading..."]
    : ["Unassigned", ...users.map((user) => user.username)];

  // Find current selected value for assignee dropdown
  const currentAssignee = editedTask.assigneeId
    ? users.find((user) => user.id === editedTask.assigneeId)?.username ||
      editedTask.assigneeName ||
      "Unassigned"
    : "Unassigned";

  // Handle when text in the description is selected and a formatting button is clicked
  const handleDescriptionFormat = (content: string) => {
    updateField("description", content);
  };

  // Hàm để xác định loại file dựa trên extension
  const getFileType = (url: string): 'image' | 'document' | 'pdf' | 'archive' | 'unknown' => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'image';
    } else if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
      return 'document';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return 'archive';
    }
    
    return 'unknown';
  };

  // Hàm để lấy biểu tượng phù hợp cho từng loại file
  const getFileIcon = (url: string) => {
    const type = getFileType(url);
    
    switch (type) {
      case 'image':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2 text-blue-500">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        );
      case 'document':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2 text-green-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        );
      case 'pdf':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2 text-red-500">
            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
          </svg>
        );
      case 'archive':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2 text-yellow-500">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-2 text-gray-500">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
        );
    }
  };

  // Fetch attachments from the File Service (attachments table)
  const fetchAttachments = async (taskId: string) => {
    try {
      console.log("Fetching attachments from attachments table for task:", taskId);
      const response = await axios.get(`http://localhost:8087/api/attachments/task/${taskId}`);
      if (response.data?.status === "SUCCESS" && response.data.data) {
        console.log("Attachments fetched from database:", response.data.data);
        // Update the task with attachments from the attachments table (via File Service)
        updateField("attachments", response.data.data);
        
        toast.success(`Loaded ${response.data.data.length} attachment(s) from database`, {
          duration: 2000,
        });
      } else {
        console.log("No attachments found in attachments table for task:", taskId);
        updateField("attachments", []);
      }
    } catch (error) {
      console.error("Error fetching attachments from attachments table:", error);
      // Don't show error toast to user as this is a background operation
      updateField("attachments", []);
    }
  };

  // Effect to fetch attachments when the modal opens
  useEffect(() => {
    if (task?.id) {
      fetchAttachments(task.id);
      fetchComments(task.id);
    }
  }, [task?.id]);

  // Helper function to get user display name by userId
  const getUserDisplayName = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.username || "Unknown User";
  };

  // Helper function to get user initials by userId
  const getUserInitials = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    if (user && user.username) {
      return user.username
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2);
    }
    return "U";
  };

  // Organize comments into parent-child structure
  const organizeComments = (comments: CommentData[]) => {
    const parentComments = comments.filter(comment => !comment.parentCommentId);
    const childComments = comments.filter(comment => comment.parentCommentId);
    
    return parentComments.map(parent => ({
      ...parent,
      replies: childComments.filter(child => child.parentCommentId === parent.id)
    }));
  };

  // Handle reply button click
  const handleReplyClick = (commentId: number) => {
    setReplyingTo(commentId);
    setReplyText("");
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[80%] max-w-5xl h-[80%] flex flex-col relative">
        {/* Header with task ID and action buttons */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-medium">
              {editedTask.shortKey || "TASK"}-{editedTask.id?.substring(0, 5)}
            </span>
            <input
              type="text"
              className="text-lg font-semibold border-none focus:ring-1 focus:ring-blue-300 rounded px-1"
              value={editedTask.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              className={`p-2 text-gray-500 hover:bg-gray-100 rounded flex items-center ${
                isWatchingTask ? "text-blue-600" : ""
              }`}
              onClick={toggleWatch}
            >
              <span
                className={isWatchingTask ? "text-blue-500" : "text-gray-500"}
              >
                👁️
              </span>
              <span className="ml-1">{isWatchingTask ? "1" : "0"}</span>
            </button>
            <button
              className={`p-2 hover:bg-gray-100 rounded ${
                isLiked ? "text-red-500" : "text-gray-500"
              }`}
              onClick={toggleLike}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                  fill={isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded">
              🔗
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded">
              ⋮
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main content - left side */}
          <div className="flex-1 overflow-y-auto p-6 w-full">
            {/* Status selection using Dropdown component */}
            <div className="flex items-center mb-6">
              <div className="mr-4">
                <span className="text-gray-700">Status:</span>
              </div>
              <div className="w-40">
                <Dropdown
                  options={statusOptions}
                  placeholder="Select Status"
                  onSelect={handleStatusChange}
                  defaultValue={statusMap[editedTask.status] || "To Do"}
                />
              </div>
              <button
                className={`ml-4 px-3 py-1 rounded-md ${
                  isSaving
                    ? "bg-gray-100 text-gray-400"
                    : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                }`}
                onClick={saveChanges}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>

            {/* Description section with TipTap Rich Text Editor */}
            <div className="mb-8 w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">Description</h3>
                <button
                  onClick={toggleDescriptionEditMode}
                  className="text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                >
                  {isEditingDescription ? (
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Done
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </span>
                  )}
                </button>
              </div>
              
              {/* TipTap editor component with full width or read-only view */}
              <div className="w-full task-description-content">
                {isEditingDescription ? (
                  <TiptapEditor 
                    content={editedTask.description || ""} 
                    onChange={(val) => updateField("description", val)}
                    taskId={editedTask.id}
                    onAttachmentUpload={handleTiptapAttachmentUpload}
                  />
                ) : (
                  <div 
                    className="border rounded p-4 bg-gray-50 min-h-[150px] prose max-w-none cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={toggleDescriptionEditMode}
                  >
                    {editedTask.description ? (
                      <div dangerouslySetInnerHTML={{ __html: editedTask.description }} />
                    ) : (
                      <p className="text-gray-400 italic">Click to add description...</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Attachments section */}
            <div className="mb-8 task-attachments-section">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">
                  Attachments
                  {editedTask.attachments && editedTask.attachments.length > 0 && (
                    <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                      {editedTask.attachments.length}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    className="p-1 hover:bg-gray-100 rounded text-gray-500"
                    title="More options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.accept = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.exe,.js,.html,.css,.java,.py,.php,.c,.cpp,.json,.xml";
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files && files.length > 0) {
                          handleFileUpload(files);
                        }
                      };
                      input.click();
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
                    title="Add files or images"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Display attachments */}
              <div 
                className="border-t pt-2 transition-colors duration-200"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add('bg-blue-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('bg-blue-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('bg-blue-50');
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}
              >
                {editedTask.attachments && editedTask.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {editedTask.attachments.map((attachment, index) => {
                      // Get file extension and details
                      let fileName = "", fileUrl = "", fileType = "";
                      
                      if (typeof attachment === 'string') {
                        // Legacy format: just URL string
                        fileUrl = attachment;
                        fileName = attachment.split('/').pop() || attachment;
                        fileType = fileName.split('.').pop()?.toLowerCase() || '';
                      } else if (typeof attachment === 'object') {
                        // New format: attachment object from database
                        fileName = attachment.file_name || '';
                        fileUrl = attachment.file_url || '';
                        fileType = attachment.file_type || '';
                      }
                      
                      // Handle filenames with timestamp prefix
                      const displayName = fileName.includes('-') ? fileName.substring(fileName.indexOf('-') + 1) : fileName;
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileType);
                      
                      // Format the date for display
                      const uploadDate = typeof attachment === 'object' && attachment.uploaded_at 
                        ? new Date(attachment.uploaded_at) 
                        : new Date();
                      
                      const formattedDate = `${uploadDate.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][uploadDate.getMonth()]} ${uploadDate.getFullYear()}, ${String(uploadDate.getHours()).padStart(2, '0')}:${String(uploadDate.getMinutes()).padStart(2, '0')} ${uploadDate.getHours() >= 12 ? 'PM' : 'AM'}`;
                      
                      return (
                        <div key={index} className="bg-white border rounded-lg overflow-hidden shadow-sm relative group hover:shadow-md transition-shadow">
                          <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                            {isImage ? (
                              <img 
                                src={fileUrl.startsWith('/api') ? `http://localhost:8087${fileUrl}` : fileUrl} 
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // If image fails to load, show a placeholder
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-4 text-gray-500">
                                {/* File type icon */}
                                {fileType === 'xlsx' || fileType === 'xls' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                  </svg>
                                ) : fileType === 'docx' || fileType === 'doc' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                  </svg>
                                )}
                                <span className="mt-2 text-xs font-medium">{fileType.toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="font-medium text-sm truncate" title={displayName}>
                              {displayName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formattedDate}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              File type: {fileType.toUpperCase()}
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 group-hover:opacity-100 flex gap-1">
                            {/* Download button */}
                            <a
                              href={fileUrl.startsWith('/api') ? `http://localhost:8087${fileUrl}` : fileUrl}
                              download={displayName}
                              className="p-1 bg-white rounded-full shadow-sm text-gray-500 hover:text-blue-500"
                              title="Download"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                            </a>
                            
                            {/* Remove button */}
                            <button
                              onClick={() => removeAttachment(index)}
                              className="p-1 bg-white rounded-full shadow-sm text-gray-500 hover:text-red-500"
                              title="Remove attachment"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 text-gray-400">
                      <path d="M13 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V9z"></path>
                      <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <p className="font-medium">No attachments yet</p>
                    <p className="text-sm mt-1">Drag and drop files here or use the + button above</p>
                  </div>
                )}
              </div>
            </div>

            {/* Activity section */}
            <div className="mb-8">
              <h3 className="text-base font-semibold mb-2">Activity</h3>
              <div className="flex border-b mb-4">
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "all"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-700"
                  }`}
                  onClick={() => setActiveTab("all")}
                >
                  All
                </button>
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "comments"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-700"
                  }`}
                  onClick={() => setActiveTab("comments")}
                >
                  Comments
                </button>
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "history"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-700"
                  }`}
                  onClick={() => setActiveTab("history")}
                >
                  History
                </button>
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "worklog"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-700"
                  }`}
                  onClick={() => setActiveTab("worklog")}
                >
                  Work log
                </button>
              </div>

              <div className="mb-4">
                <div className="flex gap-3">
                  {currentUser ? (
                    <UserAvatar user={currentUser} size="sm" />
                  ) : (
                    <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white">
                      NT
                    </div>
                  )}
                  <div className="flex-1">
                    <textarea
                      className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (comment.trim()) {
                            addComment();
                          }
                        }
                      }}
                      placeholder="Add a comment... (Press Enter to send, Shift+Enter for new line)"
                      rows={3}
                      disabled={isAddingComment}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500">
                        Press Enter to send • Shift+Enter for new line
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="border px-3 py-1 rounded-md text-sm hover:bg-gray-50 transition-colors"
                          onClick={() => setComment("")}
                          disabled={isAddingComment}
                        >
                          Cancel
                        </button>
                        <button
                          className={`px-4 py-1 rounded-md text-sm transition-colors ${
                            isAddingComment || !comment.trim()
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                          onClick={addComment}
                          disabled={isAddingComment || !comment.trim()}
                        >
                          {isAddingComment ? "Adding..." : "Comment"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {isLoadingComments ? (
                  <div className="text-center text-gray-500 py-4">Loading comments...</div>
                ) : (
                  organizeComments(comments).map((cmt) => (
                    <div key={cmt.id} className="space-y-3">
                      {/* Parent Comment */}
                      <div className="flex gap-3 group hover:bg-gray-50/50 rounded-lg p-3 -m-3 transition-colors">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm">
                          {getUserInitials(cmt.userId)}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-blue-700">{getUserDisplayName(cmt.userId)}</span>
                                <span className="text-xs text-gray-500">
                                  {formatCommentDate(cmt.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReplyClick(cmt.id)}
                                  className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded-md hover:bg-blue-50 transition-all"
                                  title="Reply to comment"
                                >
                                  Reply
                                </button>
                                {currentUser && currentUser.id === cmt.userId && (
                                  <button
                                    onClick={() => deleteComment(cmt.id)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded-md hover:bg-red-50 transition-all"
                                    title="Delete comment"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {cmt.content}
                            </div>
                          </div>
                          
                          {/* Reply Form */}
                          {replyingTo === cmt.id && (
                            <div className="mt-4 ml-4 border-l-4 border-blue-200 bg-blue-50/30 rounded-r-lg py-3 px-4">
                              <div className="flex gap-3">
                                {currentUser ? (
                                  <UserAvatar user={currentUser} size="sm" />
                                ) : (
                                  <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white text-xs">
                                    NT
                                  </div>
                                )}
                                <div className="flex-1">
                                  <textarea
                                    className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (replyText.trim()) {
                                          addReply(cmt.id);
                                        }
                                      }
                                      if (e.key === 'Escape') {
                                        cancelReply();
                                      }
                                    }}
                                    placeholder="Write a reply... (Press Enter to send, Esc to cancel)"
                                    rows={2}
                                    disabled={isAddingReply}
                                    autoFocus
                                  />
                                  <div className="flex justify-between items-center mt-2">
                                    <div className="text-xs text-gray-500">
                                      Enter to send • Esc to cancel • Shift+Enter for new line
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        className="border px-3 py-1 rounded-md text-sm hover:bg-gray-50 transition-colors"
                                        onClick={cancelReply}
                                        disabled={isAddingReply}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        className={`px-4 py-1 rounded-md text-sm transition-colors ${
                                          isAddingReply || !replyText.trim()
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-blue-600 text-white hover:bg-blue-700"
                                        }`}
                                        onClick={() => addReply(cmt.id)}
                                        disabled={isAddingReply || !replyText.trim()}
                                      >
                                        {isAddingReply ? "Replying..." : "Reply"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Replies */}
                          {cmt.replies && cmt.replies.length > 0 && (
                            <div className="mt-4 ml-4 border-l-4 border-green-200 bg-green-50/20 rounded-r-lg py-2 px-4 space-y-3">
                              <div className="text-xs text-green-700 font-medium mb-2">
                                {cmt.replies.length} {cmt.replies.length === 1 ? 'reply' : 'replies'}
                              </div>
                              {cmt.replies.map((reply) => (
                                <div key={reply.id} className="flex gap-3 group">
                                  <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
                                    {getUserInitials(reply.userId)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-white border border-green-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm text-green-700">{getUserDisplayName(reply.userId)}</span>
                                          <span className="text-xs text-gray-500">
                                            {formatCommentDate(reply.createdAt)}
                                          </span>
                                        </div>
                                        {currentUser && currentUser.id === reply.userId && (
                                          <button
                                            onClick={() => deleteComment(reply.id)}
                                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded-md hover:bg-red-50 transition-all"
                                            title="Delete reply"
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-700 leading-relaxed">
                                        {reply.content}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar for details */}
          <div className="w-[280px] border-l bg-gray-50 p-4 overflow-y-auto">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-base font-medium">Details</h3>
              <button className="text-gray-500">⚙️</button>
            </div>

            <div className="space-y-6">
              {/* Assignee with Dropdown component */}
              <div className="mb-3">
                <span className="text-gray-700 block mb-1">Assignee</span>
                <Dropdown
                  placeholder="Unassigned"
                  options={userOptions}
                  onSelect={handleAssigneeChange}
                  defaultValue={currentAssignee}
                  disabled={loadingUsers || users.length === 0}
                />
                <button
                  className="text-blue-600 text-sm mt-1"
                  onClick={assignToMe}
                  disabled={users.length === 0 || loadingUsers}
                >
                  Assign to me
                </button>
              </div>

              <div className="mb-3">
                <span className="text-gray-700 block mb-1">Label</span>
                <Input
                  className="w-full text-sm"
                  placeholder="Add a label"
                  value={editedTask.label || ""}
                  onChange={(e) => updateField("label", e.target.value)}
                />
              </div>

              <div className="mb-3">
                <span className="text-gray-700 block mb-1">Parent</span>
                <Input
                  className="w-full text-sm"
                  placeholder="Parent task ID"
                  value={editedTask.parentTaskId || ""}
                  onChange={(e) => updateField("parentTaskId", e.target.value)}
                />
              </div>

              <div className="mb-3">
                <span className="text-gray-700 block mb-1">Due date</span>
                <Input
                  type="date"
                  className="w-full text-sm"
                  value={editedTask.dueDate || ""}
                  onChange={(e) => updateField("dueDate", e.target.value)}
                />
              </div>

              {/* Sprint with Dropdown component */}
              <div className="mb-3">
                <span className="text-gray-700 block mb-1">Sprint</span>
                <Dropdown
                  placeholder="None"
                  options={["None", ...sprints.map((s) => s.name)]}
                  onSelect={handleSprintChange}
                  defaultValue={
                    sprints.find((s) => s.id === editedTask.sprintId)?.name ||
                    "None"
                  }
                />
              </div>

              <div className="mb-3">
                <span className="text-gray-700 block mb-1">
                  Story point estimate
                </span>
                <Input
                  type="number"
                  className="w-full text-sm"
                  min={0}
                  value={editedTask.storyPoint || ""}
                  onChange={(e) =>
                    updateField("storyPoint", parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
