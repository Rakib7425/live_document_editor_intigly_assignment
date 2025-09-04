import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DocsAPI } from "../api";
import { useStore } from "../store";

export default function CreateDocumentModal() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const showCreateModal = useStore((s) => s.showCreateModal);
  const setShowCreateModal = useStore((s) => s.setShowCreateModal);
  const navigate = useNavigate();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const doc = await DocsAPI.create(title.trim());
      setTitle("");
      setShowCreateModal(false);
      // Navigate to the new document
      navigate(`/doc/${doc.id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!showCreateModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Document
            </h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleCreate}>
            <div className="mb-6">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Document Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                maxLength={256}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Document"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
