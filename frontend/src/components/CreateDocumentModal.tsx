import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DocsAPI } from "../api";
import { useStore } from "../store/store";
import {
  X,
  FileText,
  Loader2,
  Sparkles,
  Users,
  PenTool,
  Briefcase,
  Clipboard,
  Code,
  ArrowRight,
} from "lucide-react";

type Template = {
  id: number;
  name: string;
  description: string;
  category: string;
  icon: any;
  color: string;
};

const getTemplateIcon = (category: string, name: string) => {
  if (name.includes("Meeting")) return Users;
  if (name.includes("Project")) return Briefcase;
  if (name.includes("Technical") || name.includes("Documentation")) return Code;
  if (name.includes("Checklist") || name.includes("Task")) return Clipboard;
  if (name.includes("Creative") || name.includes("Writing")) return PenTool;
  if (category === "Business") return Briefcase;
  if (category === "Technical") return Code;
  if (category === "Productivity") return Clipboard;
  if (category === "Creative") return PenTool;
  return FileText;
};

const getTemplateColor = (category: string) => {
  const colorMap: Record<string, string> = {
    General: "blue",
    Business: "green",
    Technical: "indigo",
    Productivity: "orange",
    Creative: "pink",
  };
  return colorMap[category] || "blue";
};

export default function CreateDocumentModal() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: 0,
      name: "Blank Document",
      description: "Start from scratch with a clean document",
      icon: FileText,
      color: "blue",
      category: "General",
    },
  ]);
  const showCreateModal = useStore((s) => s.showCreateModal);
  const setShowCreateModal = useStore((s) => s.setShowCreateModal);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (showCreateModal) {
      loadTemplates();
    }
  }, [showCreateModal]);

  async function loadTemplates() {
    try {
      const backendTemplates = await DocsAPI.getTemplates();
      const formattedTemplates: Template[] = [
        {
          id: 0,
          name: "Blank Document",
          description: "Start from scratch with a clean document",
          icon: FileText,
          color: "blue",
          category: "General",
        },
        ...backendTemplates.map((t) => ({
          ...t,
          icon: getTemplateIcon(t.category, t.name),
          color: getTemplateColor(t.category),
        })),
      ];
      setTemplates(formattedTemplates);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const templateId = selectedTemplate === 0 ? undefined : selectedTemplate;
      const doc = await DocsAPI.create(
        title.trim(),
        user?.id,
        user?.username,
        templateId
      );

      setTitle("");
      setSelectedTemplate(0);
      setShowCreateModal(false);
      navigate(`/doc/${doc.id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setLoading(false);
    }
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<
      string,
      { bg: string; text: string; border: string }
    > = {
      blue: {
        bg: "bg-blue-100",
        text: "text-blue-600",
        border: "border-blue-200",
      },
      green: {
        bg: "bg-green-100",
        text: "text-green-600",
        border: "border-green-200",
      },
      purple: {
        bg: "bg-purple-100",
        text: "text-purple-600",
        border: "border-purple-200",
      },
      indigo: {
        bg: "bg-indigo-100",
        text: "text-indigo-600",
        border: "border-indigo-200",
      },
      orange: {
        bg: "bg-orange-100",
        text: "text-orange-600",
        border: "border-orange-200",
      },
      pink: {
        bg: "bg-pink-100",
        text: "text-pink-600",
        border: "border-pink-200",
      },
    };
    return colorMap[color] || colorMap.blue;
  };

  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create New Document
                </h2>
                <p className="text-gray-600">
                  Choose a template to get started quickly
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setTitle("");
                setSelectedTemplate(0);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-160px)]">
          <form onSubmit={handleCreate}>
            {/* Document Title */}
            <div className="mb-8">
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-700 mb-3"
              >
                Document Title *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title for your document..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
                  autoFocus
                  maxLength={256}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Template Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Choose a Template
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => {
                  const Icon = template.icon;
                  const colors = getColorClasses(template.color);
                  const isSelected = selectedTemplate === template.id;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      disabled={loading}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md ${
                        isSelected
                          ? `${colors.border} ${colors.bg} shadow-md ring-2 ring-blue-500/20`
                          : "border-gray-200 hover:border-gray-300 bg-white/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isSelected ? colors.bg : "bg-gray-100"
                          }`}
                        >
                          <Icon
                            className={`w-6 h-6 ${
                              isSelected ? colors.text : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-semibold mb-1 ${
                              isSelected ? "text-gray-900" : "text-gray-800"
                            }`}
                          >
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {template.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {templates.find((t) => t.id === selectedTemplate)?.name}{" "}
                selected
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setTitle("");
                    setSelectedTemplate(0);
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || loading}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Document</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
