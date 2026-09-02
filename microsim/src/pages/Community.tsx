import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircuitBoard } from "lucide-react";
import Navbar from "../components/common/Navbar";
import FilterTab from "../components/common/FilterTab";
import type { BoardType } from "../types/types";
import { COMMUNITY_PROJECTS, type Project } from "../utils/data";
import ProjectCard from "../components/projects/ProjectCard";

const CURRENT_USER_ID = 101;

export default function Community() {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<BoardType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedProjects, setLikedProjects] = useState<Record<string, boolean>>({});

  const toggleHeart = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setLikedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return COMMUNITY_PROJECTS.filter((project) => {
      const matchesCategory = selectedCategory === "all" || project.boardType === selectedCategory;

      if (!query) return matchesCategory;

      const matchesSearch =
        project.title.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.author.toLowerCase().includes(query) ||
        project.boardLabel.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleOpenProject = (project: Project) => {
    navigate(`/simulator?project=${project.id}`);
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-100 font-sans flex flex-col">
      <Navbar />

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <section className="mb-7">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Community
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Community Projects
            </h1>

            <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-400">
              Explore circuits shared by the MicroSim community, discover
              different hardware setups, and open any public project in the
              simulator.
            </p>
          </div>
        </section>

        <FilterTab
          value={selectedCategory}
          onChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserId={CURRENT_USER_ID}
                isLiked={!!likedProjects[project.id]}
                onLike={toggleHeart}
                onOpen={handleOpenProject}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 mb-4">
              <CircuitBoard className="w-6 h-6 text-cyan-400" />
            </div>

            <h3 className="text-base font-bold text-zinc-200">
              No projects found
            </h3>

            <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
              Try another search term or choose a different hardware category.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}