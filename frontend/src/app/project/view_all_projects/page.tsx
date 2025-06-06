"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreHorizontal, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TopNavigation } from "@/components/ui/top-navigation";
import { Dropdown } from "@/components/ui/drop-down";
import { useRouter } from "next/navigation";

interface Project {
    id: string;
    name: string;
    key: string;
    projectType: string;
    access: string;
    leadName?: string;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("All");

    useEffect(() => {
        fetchAllProjects();
    }, []);
    const router = useRouter();

    const fetchAllProjects = async () => {
        try {
            // Lấy userId từ localStorage
            const ownerId = localStorage.getItem("ownerId");
            if (!ownerId) {
                console.error("No user ID found in localStorage");
                return;
            }

            // Sử dụng API mới để lấy projects mà user là member
            const res = await axios.get(`http://localhost:8083/api/projects/member/${ownerId}`);
            const data = Array.isArray(res.data.data) ? res.data.data : [];
            setProjects(data);
            console.log(`Loaded ${data.length} projects where user is member`);
        } catch (err) {
            console.error("Error fetching user projects:", err);
        }
    };

    const fetchSearchResults = async (term: string) => {
        try {
            // Lấy userId từ localStorage
            const ownerId = localStorage.getItem("ownerId");
            if (!ownerId) {
                console.error("No user ID found in localStorage");
                return;
            }

            // Sử dụng API search với user membership
            const res = await axios.get("http://localhost:8083/api/projects/search/member", {
                params: { keyword: term, userId: ownerId },
            });
            const data = Array.isArray(res.data.data) ? res.data.data : [];
            setProjects(data);
            console.log(`Found ${data.length} projects matching "${term}" where user is member`);
        } catch (err) {
            console.error("Error searching user projects:", err);
        }
    };

    const fetchFilteredProjects = async (type: string) => {
        try {
            if (type === "All") {
                fetchAllProjects();
                return;
            }

            // Lấy userId từ localStorage
            const ownerId = localStorage.getItem("ownerId");
            if (!ownerId) {
                console.error("No user ID found in localStorage");
                return;
            }

            // Lấy tất cả projects mà user là member, sau đó filter theo type ở frontend
            const res = await axios.get(`http://localhost:8083/api/projects/member/${ownerId}`);
            const allUserProjects = Array.isArray(res.data.data) ? res.data.data : [];
            
            // Filter theo project type
            const filteredProjects = allUserProjects.filter((project: Project) => 
                project.projectType?.toLowerCase() === type.toLowerCase()
            );
            
            setProjects(filteredProjects);
            console.log(`Found ${filteredProjects.length} ${type} projects where user is member`);
        } catch (err) {
            console.error("Error filtering user projects:", err);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (!searchTerm.trim()) {
                selectedType === "All" ? fetchAllProjects() : fetchFilteredProjects(selectedType);
                return;
            }

            fetchSearchResults(searchTerm);
        }, 400);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, selectedType]);

    return (
        <div className="min-h-screen bg-gray-100">
            <TopNavigation />

            <div className="max-w-7xl mx-auto p-6">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-semibold text-gray-800">My Projects</h1>
                    <Button
                        className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-sm"
                        onClick={() => router.push("/project/create_project")}
                    >
                        Create Project
                    </Button>

                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                        <Input
                            placeholder="Search projects..."
                            className="w-full sm:w-80 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="w-48">
                            <Dropdown
                                placeholder="Filter by product"
                                options={["All", "Team-managed", "Company-managed"]}
                                onSelect={(value) => {
                                    setSelectedType(value);
                                    if (!searchTerm.trim()) {
                                        fetchFilteredProjects(value);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Projects Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-auto">
                    {projects.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No projects found.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-left border-b">
                            <tr>
                                <th className="px-4 py-3 w-12"></th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Key</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Lead</th>
                                <th className="px-4 py-3">Project URL</th>
                                <th className="px-4 py-3 w-12 text-center">More</th>
                            </tr>
                            </thead>
                            <tbody>
                            {projects.map((p) => (
                                <tr key={p.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400">
                                        <Star size={16} />
                                    </td>
                                    <td className="px-4 py-3 text-[#0052CC] font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-orange-200 flex items-center justify-center text-white text-xs font-bold">
                                                {p.name[0].toUpperCase()}
                                            </div>
                                            {p.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{p.key}</td>
                                    <td className="px-4 py-3">{p.projectType} software</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-orange-400 text-white text-xs flex items-center justify-center">
                                                {p.leadName?.split(" ").map(w => w[0]).join("") || "TN"}
                                            </div>
                                            {p.leadName || "Trần Minh Nhật"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-blue-600 underline cursor-pointer">
                                        /projects/{p.id}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <MoreHorizontal size={18} className="text-gray-600 cursor-pointer" />
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination (placeholder) */}
                <div className="flex justify-center mt-6">
                    <div className="border rounded px-3 py-1 text-sm text-gray-600 bg-white shadow-sm">
                        1
                    </div>
                </div>
            </div>
        </div>
    );
}
