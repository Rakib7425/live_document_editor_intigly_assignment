import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DocsAPI } from "../api";
import { useStore, type Doc } from "../store/store";
import CreateDocumentModal from "../components/CreateDocumentModal";
import { Search, Plus, FileText, Users, Clock } from "lucide-react";

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const user = useStore((s) => s.user);
  // const showCreateModal = useStore((s) => s.showCreateModal);
  const setShowCreateModal = useStore((s) => s.setShowCreateModal);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const list = await DocsAPI.list(q || undefined);
      setDocs(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // Listen for new documents created by other users
    const handleNewDocument = (event: CustomEvent) => {
      const newDoc = event.detail;
      setDocs((prev) => [newDoc, ...prev]);
    };

    const handleDocumentUpdate = (event: CustomEvent) => {
      const { id, title } = event.detail;
      setDocs((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, title } : doc))
      );
    };

    const handleDocumentDelete = (event: CustomEvent) => {
      const { id } = event.detail;
      setDocs((prev) => prev.filter((doc) => doc.id !== id));
    };

    window.addEventListener(
      "document:created",
      handleNewDocument as EventListener
    );
    window.addEventListener(
      "document:updated",
      handleDocumentUpdate as EventListener
    );
    window.addEventListener(
      "document:deleted",
      handleDocumentDelete as EventListener
    );

    return () => {
      window.removeEventListener(
        "document:created",
        handleNewDocument as EventListener
      );
      window.removeEventListener(
        "document:updated",
        handleDocumentUpdate as EventListener
      );
      window.removeEventListener(
        "document:deleted",
        handleDocumentDelete as EventListener
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (q !== "") load();
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function getTimeAgo(date: string) {
    const now = new Date();
    const docDate = new Date(date);
    const diffInHours = Math.floor(
      (now.getTime() - docDate.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "yesterday";
    return docDate.toLocaleDateString();
  }

  function getInitials(username: string) {
    return username.charAt(0).toUpperCase();
  }

  function getAvatarColor(username: string) {
    const colors = [
      "bg-red-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-purple-500",
      "bg-yellow-500",
      "bg-pink-500",
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  }

  if (docs.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Documents
            </h1>
            <p className="text-lg text-gray-600">
              Collaborate in real-time with your team
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search documents..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Empty State */}
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No documents yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first document
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create your first document
            </button>
          </div>

          <CreateDocumentModal />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Documents
            </h1>
            <p className="text-lg text-gray-600">
              Collaborate in real-time with your team
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Document
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search documents..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/doc/${doc.id}`)}
              >
                <div className="flex items-start space-x-4">
                  {/* Document Icon */}
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {doc.title || "Untitled"}
                    </h3>

                    {/* Author */}
                    <p className="text-sm text-gray-500 mb-3">
                      by {doc.ownerUserName || "admin"}
                    </p>

                    {/* Content Preview */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {doc.content
                        ? doc.content.substring(0, 100) + "..."
                        : "Start writing to see content preview..."}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{doc.activeCount || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {getTimeAgo(doc.updatedAt || doc.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Active Users */}
                      <div className="flex -space-x-2">
                        {Array.from({
                          length: Math.min(doc.activeCount || 0, 3),
                        }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full ${getAvatarColor(
                              `user${i}`
                            )} flex items-center justify-center text-white text-xs font-medium border-2 border-white`}
                          >
                            {getInitials(`user${i}`)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateDocumentModal />
      </div>
    </div>
  );
}
