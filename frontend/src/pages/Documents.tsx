import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DocsAPI } from "../api";
import { useStore, type Doc } from "../store/store";
import CreateDocumentModal from "../components/CreateDocumentModal";
import {
  Search,
  Plus,
  FileText,
  Users,
  Clock,
  Filter,
  Grid,
  List,
  Star,
  TrendingUp,
  Activity,
  LogOut,
  MoreHorizontal,
  Share2,
  Edit3,
  SearchX,
  RefreshCw,
} from "lucide-react";

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "author">("recent");
  const [filterBy, setFilterBy] = useState<"all" | "owned" | "shared">("all");
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const user = useStore((s) => s.user);
  const socket = useStore((s) => s.socket);
  const logout = useStore((s) => s.logout);
  const setShowCreateModal = useStore((s) => s.setShowCreateModal);

  // Use stable references for functions that don't change
  const connectSocket = useStore(useCallback((s) => s.connectSocket, []));

  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

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

  // Separate effect for socket connection to avoid dependency issues
  useEffect(() => {
    if (!socket && user) {
      connectSocket();
    }
  }, [socket, user, connectSocket]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      load(); // Always reload when search query changes
    }, 300);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Socket effect for active users
  useEffect(() => {
    if (socket && user) {
      // Request initial active users list
      socket.emit("request:active-users");

      // Listen for active users updates
      const handleActiveUsersUpdate = (users: string[]) => {
        setActiveUsers(users);
      };

      socket.on("active-users:update", handleActiveUsersUpdate);

      // Set up heartbeat for global presence
      const heartbeatInterval = setInterval(() => {
        socket.emit("active:heartbeat");
      }, 20_000); // Every 20 seconds

      return () => {
        socket.off("active-users:update", handleActiveUsersUpdate);
        clearInterval(heartbeatInterval);
      };
    }
  }, [socket, user]);

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

  // Filter and sort documents
  const filteredAndSortedDocs = React.useMemo(() => {
    let filtered = docs;

    // Apply filtering
    if (filterBy === "owned") {
      filtered = docs.filter((doc) => doc.ownerUserName === user?.username);
    } else if (filterBy === "shared") {
      filtered = docs.filter((doc) => doc.ownerUserName !== user?.username);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.title || "").localeCompare(b.title || "");
        case "author":
          return (a.ownerUserName || "").localeCompare(b.ownerUserName || "");
        case "recent":
        default:
          const dateA = new Date(a.updatedAt || a.createdAt || "").getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || "").getTime();
          return dateB - dateA; // Most recent first
      }
    });

    return sorted;
  }, [docs, filterBy, sortBy, user?.username]);

  // Show welcome screen only if there are truly no documents AND no search is active
  if (docs.length === 0 && !loading && !q) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Live Docs</h1>
                  <p className="text-sm text-gray-500">
                    Welcome back, {user?.username}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform transition-all duration-200 group"
                >
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  New Document
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white/70 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100/60 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Ready to get started?
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Create your first document
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Start collaborating with your team in real-time. Create documents,
              share ideas, and build something amazing together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 group"
              >
                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Create New Document
              </button>
              {/* <div className="relative">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Or search existing documents..."
                  className="w-full sm:w-80 pl-12 pr-4 py-4 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div> */}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Edit3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Real-time Editing
              </h3>
              <p className="text-gray-600">
                See changes as they happen. Collaborate seamlessly with your
                team members in real-time.
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Team Collaboration
              </h3>
              <p className="text-gray-600">
                Invite team members, track presence, and work together on
                documents from anywhere.
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-200">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Easy Sharing
              </h3>
              <p className="text-gray-600">
                Share documents instantly with your team. Control permissions
                and track document activity.
              </p>
            </div>
          </div>
        </div>

        <CreateDocumentModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Live Docs</h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform transition-all duration-200 group"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                New Document
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-white/70 hover:bg-white border border-gray-200 hover:border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {docs.length}
                </p>
                <p className="text-sm text-gray-600">Total Documents</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    docs.filter((d) => d.ownerUserName === user?.username)
                      .length
                  }
                </p>
                <p className="text-sm text-gray-600">Owned by You</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                {/* docs.reduce((sum, d) => sum + (d.activeCount || 0), 0) */}
                <p className="text-2xl font-bold text-gray-900">
                  {activeUsers.length}
                </p>
                <p className="text-sm text-gray-600">Active Collaborators</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    docs.filter((d) => {
                      const today = new Date();
                      const docDate = new Date(
                        d.updatedAt || d.createdAt || ""
                      );
                      return (
                        today.getTime() - docDate.getTime() <
                        24 * 60 * 60 * 1000
                      );
                    }).length
                  }
                </p>
                <p className="text-sm text-gray-600">Updated Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Collaborators */}

        {/* <ActiveCollaborators activeUsers={activeUsers} user={user} /> */}

        {/* Controls */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filters and View Controls */}
            <div className="flex items-center gap-3">
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="appearance-none bg-white/70 border border-gray-200 rounded-lg px-4 py-2.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Documents</option>
                  <option value="owned">Owned by Me</option>
                  <option value="shared">Shared with Me</option>
                </select>
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white/70 border border-gray-200 rounded-lg px-4 py-2.5 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recent">Recently Updated</option>
                  <option value="name">Name</option>
                  <option value="author">Author</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/70 border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Documents Display */}
        {loading ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl animate-pulse ${
                  viewMode === "grid" ? "p-6" : "p-4 flex items-center gap-4"
                }`}
              >
                {viewMode === "grid" ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                      <div className="h-3 bg-gray-200 rounded w-4/5" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-3 bg-gray-200 rounded w-16" />
                        <div className="h-3 bg-gray-200 rounded w-20" />
                      </div>
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full" />
                        <div className="w-6 h-6 bg-gray-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="h-3 bg-gray-200 rounded w-16" />
                      <div className="h-3 bg-gray-200 rounded w-20" />
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                  </>
                )}
              </div>
            ))}
          </div>
        ) : filteredAndSortedDocs.length === 0 ? (
          // No documents found fallback
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <SearchX className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {q && filterBy !== "all"
                ? `No documents found for "${q}" in ${
                    filterBy === "owned"
                      ? "documents you own"
                      : "shared documents"
                  }`
                : q
                ? `No documents found for "${q}"`
                : filterBy === "owned"
                ? "No documents owned by you"
                : filterBy === "shared"
                ? "No documents shared with you"
                : "No documents found"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {q ? (
                <>
                  Try adjusting your search terms or{" "}
                  <button
                    onClick={() => setQ("")}
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    clear the search
                  </button>{" "}
                  to see all documents.
                </>
              ) : filterBy !== "all" ? (
                <>
                  Try changing your filter to{" "}
                  <button
                    onClick={() => setFilterBy("all")}
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    show all documents
                  </button>
                  .
                </>
              ) : docs.length > 0 ? (
                "No documents match your current criteria. Try adjusting your filters or search terms."
              ) : (
                "Start by creating your first document."
              )}
            </p>
            {q && docs.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Search Tips:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Try different keywords or shorter terms</li>
                  <li>• Check for typos in your search</li>
                  <li>• Use partial words (e.g., "meet" for "meeting")</li>
                </ul>
              </div>
            )}
            <div className="flex gap-3">
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Clear Search
                </button>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Document
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }
          >
            {filteredAndSortedDocs.map((doc) =>
              viewMode === "grid" ? (
                <div
                  key={doc.id}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                  onClick={() => navigate(`/doc/${doc.id}`)}
                >
                  {/* Hover gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                            {doc.title || "Untitled"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            by {doc.ownerUserName || "admin"}
                          </p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {doc.content
                          ? doc.content.substring(0, 120) + "..."
                          : "Start writing to see content preview..."}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{doc.activeCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {getTimeAgo(doc.updatedAt ?? doc.createdAt)}
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
                            )} flex items-center justify-center text-white text-xs font-medium border-2 border-white group-hover:scale-110 transition-transform duration-200`}
                            style={{ transitionDelay: `${i * 50}ms` }}
                          >
                            {getInitials(`user${i}`)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={doc.id}
                  className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group"
                  onClick={() => navigate(`/doc/${doc.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                        {doc.title || "Untitled"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        by {doc.ownerUserName || "admin"}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{doc.activeCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {getTimeAgo(doc.updatedAt ?? doc.createdAt)}
                        </span>
                      </div>
                    </div>

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

                    <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
        <CreateDocumentModal />
      </div>
    </div>
  );
}
