import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DocsAPI } from "../api";
import { useStore } from "../store/store";
import { 
  X, 
  FileText, 
  Loader2, 
  Sparkles,
  Users,
  BookOpen,
  PenTool,
  Briefcase,
  Clipboard,
  Code,
  ArrowRight
} from "lucide-react";

const templates = [
  {
    id: 'blank',
    name: 'Blank Document',
    description: 'Start from scratch with a clean document',
    icon: FileText,
    color: 'blue',
    content: ''
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Template for meeting minutes and action items',
    icon: Users,
    color: 'green',
    content: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** \n\n## Agenda\n\n## Discussion Points\n\n## Action Items\n\n## Next Steps\n`
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Organize project goals, timeline, and deliverables',
    icon: Briefcase,
    color: 'purple',
    content: `# Project Plan\n\n## Overview\n\n## Objectives\n\n## Timeline\n\n## Deliverables\n\n## Resources\n\n## Risk Assessment\n`
  },
  {
    id: 'documentation',
    name: 'Technical Documentation',
    description: 'Document APIs, processes, or technical specifications',
    icon: Code,
    color: 'indigo',
    content: `# Technical Documentation\n\n## Overview\n\n## Prerequisites\n\n## Installation\n\n## Usage\n\n## API Reference\n\n## Examples\n\n## Troubleshooting\n`
  },
  {
    id: 'checklist',
    name: 'Task Checklist',
    description: 'Create organized to-do lists and checklists',
    icon: Clipboard,
    color: 'orange',
    content: `# Task Checklist\n\n## Today\n- [ ] \n- [ ] \n\n## This Week\n- [ ] \n- [ ] \n\n## Completed\n- [x] Example completed task\n`
  },
  {
    id: 'creative',
    name: 'Creative Writing',
    description: 'Perfect for stories, articles, and creative content',
    icon: PenTool,
    color: 'pink',
    content: `# Creative Writing\n\n## Inspiration\n\n## Outline\n\n## Draft\n\n## Notes\n`
  }
];

export default function CreateDocumentModal() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const showCreateModal = useStore((s) => s.showCreateModal);
  const setShowCreateModal = useStore((s) => s.setShowCreateModal);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
      const doc = await DocsAPI.create(title.trim(), user?.id, user?.username);
      
      // If template has content, we could send it to the backend or handle it on the editor page
      // For now, we'll store it in localStorage to be picked up by the editor
      if (selectedTemplateData?.content) {
        localStorage.setItem(`template_content_${doc.id}`, selectedTemplateData.content);
      }
      
      setTitle("");
      setSelectedTemplate('blank');
      setShowCreateModal(false);
      navigate(`/doc/${doc.id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setLoading(false);
    }
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string, text: string, border: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' }
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
                setTitle('');
                setSelectedTemplate('blank');
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
                Document Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title for your document..."
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
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
                          : 'border-gray-200 hover:border-gray-300 bg-white/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? colors.bg : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            isSelected ? colors.text : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold mb-1 ${
                            isSelected ? 'text-gray-900' : 'text-gray-800'
                          }`}>
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
                {templates.find(t => t.id === selectedTemplate)?.name} selected
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setTitle('');
                    setSelectedTemplate('blank');
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
