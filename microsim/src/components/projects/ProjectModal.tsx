import { useState } from "react";
import {Calendar,Check,Cpu,Eye,Globe,Lock,Save,Settings,Trash2,X,} from "lucide-react";
import type { Project } from "../../utils/data";

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
  onSave: (updates: {
    title: string;
    description?: string;
    isPublic: boolean;
  }) => void;
  onDelete: () => void;
  onOpenSimulator: () => void;
}

export default function ProjectModal({
  project,
  onClose,
  onSave,
  onDelete,
  onOpenSimulator,
}: ProjectModalProps) {
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDescription, setEditDescription] = useState(
    project.description || ""
  );
  const [editIsPublic, setEditIsPublic] = useState(project.isPublic);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onSave({
      title: editTitle.trim() || project.title,
      description: editDescription.trim() || undefined,
      isPublic: editIsPublic,
    });
  };

  const handleDelete = () => {
    onDelete();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-[#111216] border border-zinc-800/90 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Accent glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative px-5 sm:px-7 py-5 border-b border-zinc-800/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Settings className="w-5 h-5 text-cyan-400" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-400 mb-1">
                  Project Settings
                </p>

                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {project.title}
                </h2>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px] sm:text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1 text-cyan-400">
                    <Cpu className="w-3 h-3" />
                    {project.boardType}
                  </span>

                  <span className="text-zinc-700">•</span>

                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.createdAt}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-y-auto max-h-[calc(92vh-180px)]">
          <div className="p-5 sm:p-7 space-y-6">
            {/* Project Information */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">
                  Project Information
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Update the name and description of your circuit design.
                </p>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label
                    htmlFor="project-title"
                    className="block text-xs font-semibold text-zinc-300 mb-2"
                  >
                    Project Title
                    <span className="text-cyan-400 ml-1">*</span>
                  </label>

                  <input
                    id="project-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter project name..."
                    className="w-full bg-[#0b0c10] border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="project-description"
                      className="text-xs font-semibold text-zinc-300"
                    >
                      Description
                      <span className="text-zinc-600 ml-1 font-normal">
                        (Optional)
                      </span>
                    </label>

                    <span className="text-[10px] text-zinc-600">
                      {editDescription.length}/300
                    </span>
                  </div>

                  <textarea
                    id="project-description"
                    value={editDescription}
                    maxLength={300}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe your circuit, components, or project purpose..."
                    className="w-full bg-[#0b0c10] border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Privacy */}
            <section>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">
                  Visibility
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Choose who can access this project.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Private */}
                <button
                  type="button"
                  onClick={() => setEditIsPublic(false)}
                  className={`relative text-left p-4 rounded-xl border transition-all ${
                    !editIsPublic
                      ? "bg-cyan-500/[0.07] border-cyan-500/60 shadow-lg shadow-cyan-500/5"
                      : "bg-[#0b0c10] border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          !editIsPublic
                            ? "bg-cyan-500/10 text-cyan-400"
                            : "bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                      </div>

                      <div>
                        <p
                          className={`text-xs font-bold ${
                            !editIsPublic
                              ? "text-white"
                              : "text-zinc-300"
                          }`}
                        >
                          Private
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                          Only you can access this design.
                        </p>
                      </div>
                    </div>

                    {!editIsPublic && (
                      <div className="h-5 w-5 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-black stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Public */}
                <button
                  type="button"
                  onClick={() => setEditIsPublic(true)}
                  className={`relative text-left p-4 rounded-xl border transition-all ${
                    editIsPublic
                      ? "bg-emerald-500/[0.06] border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                      : "bg-[#0b0c10] border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          editIsPublic
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                      </div>

                      <div>
                        <p
                          className={`text-xs font-bold ${
                            editIsPublic
                              ? "text-white"
                              : "text-zinc-300"
                          }`}
                        >
                          Public
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                          Other users can discover this design.
                        </p>
                      </div>
                    </div>

                    {editIsPublic && (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-black stroke-[3]" />
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="rounded-xl border border-red-900/30 bg-red-950/[0.08] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-red-300">
                    Danger Zone
                  </h3>

                  <p className="text-[10px] text-zinc-500 mt-1">
                    Permanently remove this circuit design.
                  </p>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-800/50 bg-red-950/30 hover:bg-red-900/40 text-red-400 hover:text-red-300 text-xs font-bold transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Design
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Confirm Delete
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="relative px-5 sm:px-7 py-4 border-t border-zinc-800/80 bg-[#0e0f13]">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onOpenSimulator}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                Open Simulator
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-lg shadow-cyan-500/10"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}