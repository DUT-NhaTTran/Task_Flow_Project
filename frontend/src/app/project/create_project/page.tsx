"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { Dropdown } from "@/components/ui/drop-down";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";

export default function CreateProjectPage() {
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [projectType, setProjectType] = useState("");
    const [access, setAccess] = useState("");
    const [deadline, setDeadline] = useState("");
    const [ownerId, setOwnerId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const id = localStorage.getItem("ownerId");
        if (id) {
            setOwnerId(id);
        } else {
            console.warn("Owner ID not found in localStorage");
        }
    }, []);

    const handleSubmit = async () => {
        if (!ownerId) {
            toast.error("Owner ID is missing. Please log in again.");
            return;
        }

        try {
            // Gửi yêu cầu tạo Project
            const payload = {
                name,
                key,
                description,
                projectType,
                access,
                ownerId,
                deadline,
                createdAt: new Date().toISOString(),
            };

            const res = await axios.post("http://localhost:8083/api/projects", payload);
            const newProjectId: string = res.data?.data?.id;

            if (!newProjectId) {
                toast.error("Project created but no ID returned.");
                return;
            }

            // Gửi yêu cầu tạo Sprint mặc định
            const sprintPayload = {
                name: "Sprint 1",
                projectId: newProjectId,
                startDate: new Date().toISOString().split("T")[0],
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                goal: null,
                status: null,
                createdAt: null,
                updatedAt: null
            };

            await axios.post("http://localhost:8084/api/sprints", sprintPayload);

            toast.success("Project and default sprint created successfully!");
            router.push(`/project/project_homescreen?projectId=${newProjectId}`);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const axiosErr = err as AxiosError<{ message?: string }>;
                console.error("Axios Error:", axiosErr.response?.data?.message ?? axiosErr.message ?? axiosErr);
                toast.error("Error: " + (axiosErr.response?.data?.message || axiosErr.message || "Unknown error"));
            } else if (err instanceof Error) {
                console.error("Error:", err.message);
                toast.error("Error: " + err.message);
            } else {
                console.error("Unknown error", err);
                toast.error("Unknown error occurred.");
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <TopNavigation />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto p-8 bg-white">
                    <h1 className="text-2xl font-bold mb-2">Add project details</h1>
                    <p className="text-sm text-gray-600 mb-6">
                        Explore what's possible when you collaborate with your team. Edit project details anytime in project settings.
                    </p>
                    <p className="text-xs text-gray-500 mb-6">
                        <span className="text-red-500">*</span> Required fields are marked with an asterisk
                    </p>

                    <div className="md:col-span-2 grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className="flex items-center text-sm font-semibold mb-1 gap-1">
                                Key <span className="text-red-500">*</span>
                                <Info className="w-4 h-4 text-gray-400" />
                            </label>
                            <Input value={key} onChange={e => setKey(e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold mb-1">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Project Type <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                placeholder="Select project type"
                                options={["Team-managed", "Company-managed"]}
                                onSelect={setProjectType}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Access <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                placeholder="Choose an access level"
                                options={["Private", "Public"]}
                                onSelect={setAccess}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Deadline <span className="text-red-500">*</span>
                            </label>
                            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-10">
                        <Button variant="outline" className="text-sm">Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!name || !key || !description || !projectType || !access || !deadline}
                            className={`text-sm ${name && key && description && projectType && access && deadline ? "bg-[#0052CC] text-white" : "bg-gray-300 text-gray-600"}`}
                        >
                            Create project
                        </Button>
                    </div>
                </main>
            </div>
        </div>
    );
}
