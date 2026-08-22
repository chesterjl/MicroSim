import {
  ArrowUpRight,
  Cpu,
  Heart,
  User,
} from "lucide-react";
import type { CommunityProject } from "../../../utils/data";

interface ProjectCardProps {
  project: CommunityProject;
  isLiked: boolean;
  onLike: (e: React.MouseEvent, projectId: string) => void;
  onOpen: (project: CommunityProject) => void;
}

export default function ProjectCard({
  project,
  isLiked,
  onLike,
  onOpen,
}: ProjectCardProps) {
  const heartCount = project.hearts + (isLiked ? 1 : 0);

  return (
    <div
      onClick={() => onOpen(project)}
      className="
        group
        flex flex-col
        overflow-hidden
        rounded-xl
        border border-zinc-800/80
        bg-zinc-900/70
        shadow-lg
        cursor-pointer
        transition-all duration-200
        hover:-translate-y-0.5
        hover:border-cyan-500/40
        hover:bg-zinc-900
        hover:shadow-cyan-500/5
      "
    >
      <div className="relative h-44 sm:h-48 w-full bg-[#050608] overflow-hidden border-b border-zinc-800/80">
        {project.circuitImage ? (
          <>
            <img
              src={project.circuitImage}
              alt={`${project.title} circuit preview`}
              className="
                w-full h-full object-cover
                opacity-80
                transition-all duration-300
                group-hover:scale-[1.03]
                group-hover:opacity-100
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

        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950/85 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-300 backdrop-blur-md">
            <Cpu className="w-3 h-3" />
            {project.boardLabel}
          </span>
        </div>

        <div
          className="
            absolute top-3 right-3
            flex items-center justify-center
            w-8 h-8
            rounded-lg
            bg-zinc-950/80
            border border-zinc-700/80
            text-zinc-400
            opacity-0
            translate-y-1
            transition-all duration-200
            group-hover:opacity-100
            group-hover:translate-y-0
          "
        >
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Title + Description */}
        <div>
          <h3
            className="
              text-sm sm:text-base
              font-bold
              text-white
              leading-snug
              line-clamp-2
              transition-colors
              group-hover:text-cyan-400
            "
          >
            {project.title}
          </h3>

          {/* Only render description when one exists */}
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

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="
                  rounded-md
                  border border-zinc-800
                  bg-zinc-950/70
                  px-2 py-1
                  text-[10px]
                  font-medium
                  text-zinc-400
                "
              >
                #{tag}
              </span>
            ))}

            {project.tags.length > 4 && (
              <span
                className="
                  rounded-md
                  border border-zinc-800
                  bg-zinc-950/70
                  px-2 py-1
                  text-[10px]
                  text-zinc-600
                "
              >
                +{project.tags.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-3">
          {/* Author */}
          <div className="min-w-0 flex items-center gap-1.5 text-xs text-zinc-400">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
              <User className="w-3 h-3 text-zinc-400" />
            </div>

            <span className="truncate font-medium text-zinc-300">
              {project.author}
            </span>
          </div>

          {/* Like */}
          <button
            type="button"
            onClick={(e) => onLike(e, project.id)}
            aria-label={isLiked ? "Unlike project" : "Like project"}
            className={`
              shrink-0
              inline-flex items-center gap-1.5
              rounded-lg
              px-2 py-1.5
              text-xs
              transition-colors
              ${
                isLiked
                  ? "text-rose-400 bg-rose-500/10"
                  : "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5"
              }
            `}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isLiked ? "fill-current" : ""
              }`}
            />

            <span className={isLiked ? "font-semibold" : ""}>
              {heartCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}