import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Cpu, Globe, Lock, CircuitBoard, Settings } from "lucide-react";
import Navbar from "../components/common/Navbar";
import FilterTab from "../components/common/FilterTab";
import EditProjectModal from "../components/parts/project/EditProjectModal";
import type { BoardType } from "../types/types";
import type { SavedProject } from "../components/parts/project/ProjectModal";
import { INITIAL_PROJECTS } from "../utils/data";

export default function MyProject() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<SavedProject[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<BoardType>("all");
  const [selectedProject, setSelectedProject] = useState<SavedProject | null>(null);

  const filteredProjects = projects.filter((project) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      project.title.toLowerCase().includes(q) ||
      (project.description && project.description.toLowerCase().includes(q));

    let matchesFilter = true;

    if (activeFilter !== "all") {
      if (activeFilter === "arduino") {
        matchesFilter = project.boardType === "Arduino Uno R3";
      }

      if (activeFilter === "esp32") {
        matchesFilter = project.boardType === "ESP32";
      }

      if (activeFilter === "raspberry-pi") {
        matchesFilter = project.boardType === "Raspberry Pi";
      }
    }

    return matchesSearch && matchesFilter;
  });

  const handleOpenSettings = (e: React.MouseEvent, project: SavedProject) => {
    e.stopPropagation();
    setSelectedProject(project);
  };

  const handleSaveSettings = (updatedProject: {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
  }) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === updatedProject.id
          ? {
              ...project,
              title: updatedProject.title,
              description: updatedProject.description,
              isPublic: updatedProject.isPublic,
            }
          : project
      )
    );

    setSelectedProject(null);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-100 font-sans selection:bg-cyan-500 selection:text-black flex flex-col">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/simulator?project=${project.id}`)}
                className="group cursor-pointer flex flex-col rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-cyan-500/50 transition-all duration-200 overflow-hidden shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="relative h-44 w-full bg-[#050608] border-b border-zinc-800/80 overflow-hidden">
                  {project.circuitImage ? (
                    <img
                      src={project.circuitImage}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-zinc-600 group-hover:text-cyan-500/60 transition-colors">
                      <CircuitBoard className="w-12 h-12 stroke-[1.2]" />

                      <span className="text-[10px] font-mono tracking-widest uppercase">
                        Circuit Canvas
                      </span>
                    </div>
                  )}

                  {/* Settings */}
                  <button
                    onClick={(e) => handleOpenSettings(e, project)}
                    title="Project Settings"
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {project.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-mono text-cyan-400">
                        <Cpu className="w-3 h-3" />
                        {project.boardType}
                      </span>

                      <span>•</span>

                      <span className="flex items-center gap-1 font-mono text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        {project.updatedAt}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-zinc-800/50 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 font-medium">
                      {project.isPublic ? (
                        <span className="text-emerald-400 inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Public
                        </span>
                      ) : (
                        <span className="text-zinc-500 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Private
                        </span>
                      )}
                    </div>

                    <span className="text-zinc-500 font-mono text-[10px]">
                      {project.componentsCount} Parts
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4 border border-zinc-800">
              <CircuitBoard className="w-6 h-6 text-cyan-400" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              No Projects Found
            </h3>

            <p className="text-xs text-zinc-400 max-w-xs mb-6">
              Try another search term or choose a different
              hardware category.
            </p>
          </div>
        )}
      </main>

      {selectedProject && (
        <EditProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onSave={handleSaveSettings}
          onDelete={handleDeleteProject}
        />
      )}
    </div>
  );
}