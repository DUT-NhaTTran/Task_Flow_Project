import { GEMINI_CONFIG } from '@/lib/config';

export interface ProjectMember {
  userId: string;
  username: string;
  email: string;
  role: string;
  actualRole?: string;
  avatar?: string;
  fullName?: string;
}

export interface ProjectData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  members: ProjectMember[];
}

export interface CompletedProjectInfo {
  name: string;
  description: string;
  duration: number;
  sprintCount: number;
  taskCount: number;
  technology: string[];
  teamSize: number;
}

export interface AIGeneratedSprint {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  goals: string[];
}

export interface AIGeneratedTask {
  title: string;
  description: string;
  label: 'STORY' | 'BUG' | 'TASK' | 'EPIC';
  priority: 'LOWEST' | 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
  estimatedHours: number;
  assigneeRole: string;
  sprintIndex: number;
  sprint?: string;
  dependencies: string[];
  parentTaskTitle?: string;
  isParent: boolean;
  level: 'PARENT' | 'SUBTASK';
  assignee?: ProjectMember;
}

export interface AIProjectPlan {
  sprints: AIGeneratedSprint[];
  tasks: AIGeneratedTask[];
  recommendations: string[];
  estimatedCompletion: string;
}

class GeminiService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = GEMINI_CONFIG.API_KEY;
    this.apiUrl = GEMINI_CONFIG.API_URL;
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`${this.apiUrl}/${GEMINI_CONFIG.MODEL}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  private createProjectPrompt(projectData: ProjectData): string {
    const membersList = projectData.members.map(m => 
      `- ${m.username} (${m.role})`
    ).join('\n');

    // Calculate project metrics
    const projectDurationDays = Math.ceil((new Date(projectData.endDate).getTime() - new Date(projectData.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const numSprints = Math.ceil(projectDurationDays / 14); // 2-week sprints
    const teamSize = projectData.members.length;
    const tasksPerSprint = Math.max(Math.ceil(teamSize * 2), 8); // 2 tasks per person, min 8
    const totalTasks = tasksPerSprint * numSprints;

    return `Generate a complete project plan for: ${projectData.name}
Description: ${projectData.description}

REQUIREMENTS:
- Duration: ${projectDurationDays} days = ${numSprints} sprints
- Team: ${teamSize} members
- Generate: ${totalTasks} tasks total (${tasksPerSprint} per sprint)

TEAM MEMBERS:
${membersList}

RULES:
1. Generate EXACTLY ${totalTasks} tasks across ${numSprints} sprints
2. Each sprint must have ${tasksPerSprint} tasks
3. 70% parent tasks (STORY), 30% subtasks (TASK)
4. Use roles: Frontend Developer, Backend Developer, Full Stack Developer, Tester, Designer
5. Priority levels: HIGHEST, HIGH, MEDIUM, LOW, LOWEST

OUTPUT JSON FORMAT (no markdown):
{
  "sprints": [
    {
      "name": "Sprint 1: Foundation",
      "description": "Project setup and core features", 
      "startDate": "${projectData.startDate}",
      "endDate": "2024-01-15",
      "goals": ["Setup project", "Core features"]
    }
  ],
  "tasks": [
    {
      "title": "User Authentication System",
      "description": "Complete user login and registration",
      "label": "STORY",
      "priority": "HIGHEST",
      "storyPoint": 3,
      "assigneeRole": "Full Stack Developer",
      "sprintIndex": 0,
      "dependencies": [],
      "parentTaskTitle": null,
      "isParent": true,
      "level": "PARENT"
    }
  ],
  "recommendations": ["Focus on MVP", "Implement testing"],
  "estimatedCompletion": "${projectData.endDate}"
}`;
  }

  async generateProjectPlan(
    projectData: ProjectData,
    completedProjects: CompletedProjectInfo[] = []
  ): Promise<AIProjectPlan> {
    try {
      const prompt = this.createProjectPrompt(projectData);
      const response = await this.callGeminiAPI(prompt);
      
      // Clean and parse JSON response
      let cleanResponse = response
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No valid JSON found in response');
      }
      
      const jsonString = cleanResponse.substring(jsonStart, jsonEnd);
      
      // Fix common JSON issues
      let fixedJson = jsonString.replace(/,(\s*[}\]])/g, '$1');
      
      const result = JSON.parse(fixedJson);
      
      // Sanitize result
      const sanitizedResult = {
        sprints: result.sprints || [],
        tasks: (result.tasks || []).map((task: any) => ({
          ...task,
          level: task.level || 'PARENT',
          isParent: task.isParent !== undefined ? task.isParent : task.level === 'PARENT',
          parentTaskTitle: task.parentTaskTitle || undefined,
          dependencies: task.dependencies || [],
          estimatedHours: task.storyPoint ? task.storyPoint * 8 : (task.estimatedHours || 8)
        })),
        recommendations: result.recommendations || [],
        estimatedCompletion: result.estimatedCompletion || projectData.endDate
      };
      
      return this.redistributeTasksIfNeeded(sanitizedResult);
      
    } catch (error) {
      console.error('Error generating project plan:', error);
      
      // Fallback plan
        const fallbackSprints = Math.ceil((new Date(projectData.endDate).getTime() - new Date(projectData.startDate).getTime()) / (1000 * 60 * 60 * 24 * 14));
        
        return {
          sprints: Array.from({ length: fallbackSprints }, (_, i) => ({
            name: `Sprint ${i + 1}`,
            description: `Sprint ${i + 1} development phase`,
            startDate: new Date(new Date(projectData.startDate).getTime() + (i * 14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
            endDate: new Date(new Date(projectData.startDate).getTime() + ((i + 1) * 14 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          goals: ['Development tasks', 'Testing']
          })),
          tasks: [
            {
              title: 'Project Setup',
            description: 'Initialize project structure',
              label: 'STORY' as const,
              priority: 'HIGHEST' as const,
              estimatedHours: 16,
              assigneeRole: 'Full Stack Developer',
              sprintIndex: 0,
              dependencies: [],
              parentTaskTitle: undefined,
              isParent: true,
              level: 'PARENT' as const
          }
        ],
        recommendations: ['Start with project setup', 'Focus on core features'],
          estimatedCompletion: projectData.endDate
        };
      }
  }

  private redistributeTasksIfNeeded(plan: AIProjectPlan): AIProjectPlan {
    const { sprints, tasks } = plan;
    
    if (!sprints.length || !tasks.length) return plan;
    
    // Check if tasks are evenly distributed
    const distribution = new Array(sprints.length).fill(0);
    tasks.forEach(task => {
      if (task.sprintIndex >= 0 && task.sprintIndex < sprints.length) {
        distribution[task.sprintIndex]++;
      }
    });
    
    const maxTasks = Math.max(...distribution);
    const minTasks = Math.min(...distribution);
    
    // If already balanced, return as is
    if (maxTasks - minTasks <= 2) return plan;
    
    // Redistribute tasks evenly
    const tasksPerSprint = Math.ceil(tasks.length / sprints.length);
    const redistributedTasks = tasks.map((task, index) => ({
      ...task,
      sprintIndex: Math.min(Math.floor(index / tasksPerSprint), sprints.length - 1)
    }));
    
    return {
      ...plan,
      tasks: redistributedTasks
    };
  }

  async improveTaskDescription(taskTitle: string, currentDescription: string): Promise<string> {
    const prompt = `Improve this task description:

Task: ${taskTitle}
Current: ${currentDescription}

Provide a better description with specific requirements and acceptance criteria. Return only the improved text.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error improving task description:', error);
      return currentDescription;
    }
  }
}

export default new GeminiService(); 