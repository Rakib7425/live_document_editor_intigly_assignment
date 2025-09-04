import { useState, useEffect } from "react";
import { DocsAPI } from "../api";
import { X, Clock, User, FileText } from "lucide-react";

interface Version {
  id: number;
  content: string;
  version: number;
  createdAt: string;
  createdBy?: number;
}

interface VersionHistoryModalProps {
  docId: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectVersion?: (version: Version) => void;
}

export default function VersionHistoryModal({
  docId,
  isOpen,
  onClose,
  onSelectVersion,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && docId) {
      loadVersions();
    }
  }, [isOpen, docId]);

  async function loadVersions() {
    setLoading(true);
    try {
      const data = await DocsAPI.getVersions(docId);
      setVersions(data);
    } catch (error) {
      console.error("Failed to load versions:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getContentPreview(content: string) {
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Version History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading versions...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No versions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          Version {version.version}
                        </span>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDateTime(version.createdAt)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {getContentPreview(version.content)}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="w-3 h-3 mr-1" />
                        {version.createdBy
                          ? `User ${version.createdBy}`
                          : "System"}
                      </div>
                    </div>
                    {onSelectVersion && (
                      <button
                        onClick={() => onSelectVersion(version)}
                        className="ml-4 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
