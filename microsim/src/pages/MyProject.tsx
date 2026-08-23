import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CircuitBoard } from "lucide-react";
import Navbar from "../components/common/Navbar";
import FilterTab from "../components/common/FilterTab";
import ProjectCard from "../components/parts/project/ProjectCard";
import type { BoardType } from "../types/types";
import { MY_PROJECTS, type Project } from "../utils/data";

export interface User {
  id: number;
  name: string;
  email: string;
}

export const USER_DATA: User = {
  id: 101,
  name: "Chester Lauzon",
  email: "chester@gmail.com",
};

export default function MyProject() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>(MY_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BoardType>("all");
  const [user] = useState<User>(USER_DATA);

  const filteredProjects = projects.filter((project) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      project.title.toLowerCase().includes(q) ||
      (project.description && project.description.toLowerCase().includes(q));

    const matchesFilter = activeFilter === "all" || project.boardType === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const handleSaveSettings = (updatedProject: {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
  }) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
    );
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleOpenProject = (project: Project) => {
    navigate(`/simulator?project=${project.id}`);
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-100 font-sans flex flex-col">
      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Your Designs
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Manage, edit, and launch your hardware circuit designs.
            </p>
          </div>

          <button
            onClick={() => navigate("/simulator")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Design</span>
          </button>
        </div>

        <FilterTab
          value={activeFilter}
          onChange={setActiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserId={user.id}
                showPrivacyBadge={true}
                onOpen={handleOpenProject}
                onSaveProject={handleSaveSettings}
                onDeleteProject={handleDeleteProject}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4 border border-zinc-800">
              <CircuitBoard className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Projects Found</h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-6">
              Try another search term or choose a different hardware category.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}