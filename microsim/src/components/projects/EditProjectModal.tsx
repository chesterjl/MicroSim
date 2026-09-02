import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, X, Lock, Globe, Check, Trash2, Eye } from "lucide-react";
import type { Project } from "../../utils/data";

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSave: (updatedProject: {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
  }) => void;
  onDelete: (id: string) => void;
}

export default function EditProjectModal({
  project,
  onClose,
  onSave,
  onDelete,
}: EditProjectModalProps) {
  const navigate = useNavigate();

  const [editTitle, setEditTitle] = useState(project.title);
  const [editDescription, setEditDescription] = useState(project.description || "");
  const [editIsPublic, setEditIsPublic] = useState(project.isPublic);

  useEffect(() => {
    setEditTitle(project.title);
    setEditDescription(project.description || "");
    setEditIsPublic(project.isPublic);
  }, [project]);

  const handleSave = () => {
    onSave({
      id: project.id,
      title: editTitle.trim() || project.title,
      description: editDescription.trim() || undefined,
      isPublic: editIsPublic,
    });
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800/90 p-4 sm:p-6 shadow-2xl overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Project Settings</span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 py-4 sm:py-5 flex-1">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Project Title <span className="text-cyan-400">*</span>
            </label>

            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Circuit project name..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Description <span className="text-zinc-500">(Optional)</span>
            </label>

            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              placeholder="Describe your hardware components or logic..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/60 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2">
              Privacy Settings
            </label>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Private Button */}
              <button
                type="button"
                onClick={() => setEditIsPublic(false)}
                className={`flex items-center justify-between px-3 py-2.5 sm:p-3 rounded-xl border transition-all ${
                  !editIsPublic
                    ? "bg-cyan-950/30 border-cyan-500 text-white"
                    : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium truncate">
                  <Lock className="hidden sm:block w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">Private</span>
                </div>

                {!editIsPublic && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0 ml-1" />}
              </button>

              {/* Public Button */}
              <button
                type="button"
                onClick={() => setEditIsPublic(true)}
                className={`flex items-center justify-between px-3 py-2.5 sm:p-3 rounded-xl border transition-all ${
                  editIsPublic
                    ? "bg-cyan-950/30 border-cyan-500 text-white"
                    : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium truncate">
                  <Globe className="hidden sm:block w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Public</span>
                </div>

                {editIsPublic && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0 ml-1" />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 sm:pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 text-xs font-bold transition-all order-2 sm:order-1"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Delete Design</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/simulator?project=${project.id}`);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>
                Open<span className="hidden sm:inline"> Simulator</span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              <span>
                Save<span className="hidden sm:inline"> Changes</span>
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}