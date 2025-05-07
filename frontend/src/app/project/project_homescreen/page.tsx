"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Task {
    id: string;
    content: string;
    status: "TO_DO" | "IN_PROGRESS" | "DONE";
}

interface Project {
    id: string;
    name: string;
}

export default function ProjectBoardPage() {
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskContent, setNewTaskContent] = useState("");

    // Fetch project info
    useEffect(() => {
        if (!projectId) return;
        axios.get(`http://localhost:8083/api/projects/${projectId}`)
            .then(res => {
                setProject(res.data?.data);
            })
            .catch(err => {
                console.error("Error fetching project:", err);
            });
    }, [projectId]);

    // Fetch tasks
    useEffect(() => {
        if (!projectId) return;
        axios.get(`http://localhost:8083/api/projects/${projectId}/tasks`)
            .then(res => {
                if (Array.isArray(res.data.data)) {
                    setTasks(res.data.data);
                }
            }).catch(err => {
            console.error("Error fetching tasks:", err);
        });
    }, [projectId]);

    const handleCreateTask = async () => {
        if (!newTaskContent.trim() || !projectId) return;

        try {
            const res = await axios.post("http://localhost:8083/api/tasks", {
                content: newTaskContent,
                status: "TO_DO",
                projectId
            });
            setTasks([...tasks, res.data]);
            setNewTaskContent("");
        } catch (err) {
            console.error("Error creating task:", err);
        }
    };

    const renderColumn = (title: string, status: Task["status"]) => (
        <div className="flex-1 bg-gray-50 rounded p-4 min-h-[300px]">
            <h2 className="font-semibold text-sm mb-4 uppercase">{title}</h2>
            {tasks.filter(task => task.status === status).map(task => (
                <div key={task.id} className="bg-white border p-2 mb-2 rounded shadow-sm text-sm">
                    {task.content}
                </div>
            ))}

            {status === "TO_DO" && (
                <div className="mt-4 border rounded p-2 bg-white">
                    <Input
                        className="text-sm mb-2"
                        placeholder="What needs to be done?"
                        value={newTaskContent}
                        onChange={e => setNewTaskContent(e.target.value)}
                    />
                    <Button
                        size="sm"
                        className="w-full"
                        disabled={!newTaskContent.trim()}
                        onClick={handleCreateTask}
                    >
                        Create
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopNavigation />
                <main className="flex-1 overflow-auto p-8">
                    <h1 className="text-xl font-bold mb-2">
                        {project ? `${project.name} board` : "Project Board"}
                    </h1>

                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Search board"
                                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                            />
                            <div className="flex items-center gap-1">
                                <div className="bg-gray-200 rounded-full p-1">
                                    <span className="bg-orange-400 text-white text-xs font-semibold rounded-full px-2 py-1">TN</span>
                                </div>
                                <div className="bg-gray-200 rounded-full p-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9l-6 6-6-6" />
                                    </svg>
                                </div>
                            </div>
                            <button className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded border border-gray-300">Filter</button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">Group by</div>
                            <button className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded border border-gray-300">Assignee ▼</button>
                            <button className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded border border-gray-300">📈 Insights</button>
                            <button className="bg-gray-100 hover:bg-gray-200 text-sm px-3 py-1 rounded border border-gray-300">⚙️ View settings</button>
                        </div>
                    </div>

                    {!projectId ? (
                        <p className="text-red-500">❗Missing projectId in URL</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {renderColumn("To Do", "TO_DO")}
                            {renderColumn("In Progress", "IN_PROGRESS")}
                            {renderColumn("Done", "DONE")}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
