import { useState } from "react";
import { ArrowUpRight, Cpu, Heart, Settings, User, Globe, Lock } from "lucide-react";
import EditProjectModal from "./EditProjectModal";
import type { Project } from "../../../utils/data";

interface ProjectCardProps {
  project: Project;
  currentUserId?: number;
  isLiked?: boolean;
  showPrivacyBadge?: boolean;
  onLike?: (e: React.MouseEvent, projectId: string) => void;
  onOpen: (project: Project) => void;
  onSaveProject?: (updatedProject: {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
  }) => void;
  onDeleteProject?: (id: string) => void;
}

export default function ProjectCard({
  project,
  currentUserId,
  isLiked = false,
  showPrivacyBadge = false,
  onLike,
  onOpen,
  onSaveProject,
  onDeleteProject,
}: ProjectCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwner = currentUserId !== undefined && project.authorId === currentUserId;
  const heartCount = project.hearts + (isLiked ? 1 : 0);

  const handleOpenSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const handleSave = (updatedData: {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
  }) => {
    onSaveProject?.(updatedData);
    setIsEditModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onDeleteProject?.(id);
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div
        onClick={() => onOpen(project)}
        className="
          group flex flex-col overflow-hidden rounded-xl
          border border-zinc-800/80 bg-zinc-900/70 shadow-lg
          cursor-pointer transition-all duration-200
          hover:-translate-y-0.5 hover:border-cyan-500/40 hover:bg-zinc-900 hover:shadow-cyan-500/5
        "
      >
        <div className="relative h-44 sm:h-48 w-full bg-[#050608] overflow-hidden border-b border-zinc-800/80">
          {project.circuitImage ? (
            <>
              <img
                src={project.circuitImage}
                alt={`${project.title} circuit preview`}
                className="
                  w-full h-full object-cover opacity-80
                  transition-all duration-300 group-hover:scale-[1.03] group-hover:opacity-100
                "
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-zinc-600">
                <Cpu className="w-10 h-10 stroke-[1.2]" />
                <span className="text-[10px] font-mono uppercase tracking-widest">
                  Circuit Canvas
                </span>
              </div>
            </div>
          )}

          {/* Board Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950/85 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-300 backdrop-blur-md">
              <Cpu className="w-3 h-3" />
              {project.boardLabel}
            </span>
          </div>

          {/* Action Button: Settings rendered ONLY if current user is owner */}
          {isOwner ? (
            <button
              type="button"
              onClick={handleOpenSettings}
              title="Project Settings"
              className="
                absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-lg
                bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-white
                transition-all duration-200 opacity-80 sm:opacity-0 group-hover:opacity-100
              "
            >
              <Settings className="w-4 h-4" />
            </button>
          ) : (
            <div
              className="
                absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-lg
                bg-zinc-950/80 border border-zinc-700/80 text-zinc-400 opacity-0 translate-y-1
                transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0
              "
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 transition-colors group-hover:text-cyan-400">
              {project.title}
            </h3>

            {project.description ? (
              <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-2">
                {project.description}
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-600 italic">
                No description provided.
              </p>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1.5 text-xs text-zinc-400">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
                <User className="w-3 h-3 text-zinc-400" />
              </div>
              <span className="truncate font-medium text-zinc-300">
                {project.author}
              </span>
            </div>

            {showPrivacyBadge ? (
              <div className="text-[11px] font-medium shrink-0">
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
            ) : (
              onLike && (
                <button
                  type="button"
                  onClick={(e) => onLike(e, project.id)}
                  aria-label={isLiked ? "Unlike project" : "Like project"}
                  className={`
                    shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors
                    ${
                      isLiked
                        ? "text-rose-400 bg-rose-500/10"
                        : "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5"
                    }
                  `}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                  <span className={isLiked ? "font-semibold" : ""}>{heartCount}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Encapsulated Modal State */}
      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}