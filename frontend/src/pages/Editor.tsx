import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { DocsAPI } from "../api";
import VersionHistoryModal from "../components/VersionHistoryModal";
import {
  Share2,
  Copy,
  Check,
  ArrowLeft,
  Edit3,
  Trash2,
  Settings,
  Users,
  MessageCircle,
  Send,
  X,
  History,
  Save,
} from "lucide-react";

export default function Editor({ docId }: { docId: number }) {
  const {
    user,
    socket,
    connectSocket,
    setCurrentDoc,
    currentDoc,
    messages,
    clearMessages,
    addMessage,
    cursors,
  } = useStore();
  const docUsers = useStore((s) => s.docUsers);
  const [content, setContent] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const [caretPosition, setCaretPosition] = useState({ x: 0, y: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      if (!socket) connectSocket();
      const { doc, messages } = await DocsAPI.get(docId);
      setCurrentDoc(doc);
      setContent(doc.content || "");
      setTitleInput(doc.title || "");
      clearMessages();
      for (const m of messages)
        addMessage({
          message: m.message,
          createdAt: m.createdAt,
          user: { id: m.userId, username: m.username },
        });
    }
    init();
    return () => {
      setCurrentDoc(undefined);
    };
  }, [docId]);

  useEffect(() => {
    if (!socket || !user || !currentDoc) return;
    socket.emit("joinDoc", { docId, username: user.username, userId: user.id });
    const onTyping = (t: { kind: "editor" | "chat"; username: string }) => {
      setTyping(
        `${t.username} is typing${t.kind === "chat" ? " in chat" : ""}...`
      );
      const timer = setTimeout(() => setTyping(null), 1200);
      return () => clearTimeout(timer);
    };
    socket.on("typing", onTyping);

    // Set up heartbeat for document presence
    const heartbeatInterval = setInterval(() => {
      socket.emit("doc:heartbeat", { docId });
    }, 20_000); // Every 20 seconds

    return () => {
      socket.emit("leaveDoc", { docId });
      socket.off("typing", onTyping);
      clearInterval(heartbeatInterval);
    };
  }, [socket, user, currentDoc, docId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for remote edits
  useEffect(() => {
    const handleRemoteEdit = (event: CustomEvent) => {
      const { userId, content: remoteContent, version } = event.detail;

      // Don't apply our own edits
      if (userId === socket?.id) return;

      // Apply the remote content directly
      if (remoteContent !== undefined) {
        setContent(remoteContent);
        if (currentDoc) {
          setCurrentDoc({ ...currentDoc, content: remoteContent, version });
        }
      }
    };

    window.addEventListener("document:edit", handleRemoteEdit as EventListener);

    return () => {
      window.removeEventListener(
        "document:edit",
        handleRemoteEdit as EventListener
      );
    };
  }, [socket, currentDoc]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Function to calculate exact cursor position for local caret
  function getCursorPosition(
    textarea: HTMLTextAreaElement,
    cursorIndex: number
  ) {
    // Create a temporary div to measure text
    const div = document.createElement("div");
    const style = getComputedStyle(textarea);

    // Copy all relevant styles from textarea to div
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";
    div.style.font = style.font;
    div.style.fontSize = style.fontSize;
    div.style.fontFamily = style.fontFamily;
    div.style.lineHeight = style.lineHeight;
    div.style.padding = style.padding;
    div.style.border = style.border;
    div.style.width = style.width;
    div.style.height = style.height;

    document.body.appendChild(div);

    // Get text before cursor
    const textBeforeCursor = textarea.value.substring(0, cursorIndex);

    // Create the text content up to cursor
    div.innerHTML = textBeforeCursor.replace(/\n/g, "<br>");

    // Get the position of the last character
    const rect = div.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();

    const x = rect.right - textareaRect.left;
    const y = rect.bottom - textareaRect.top - parseInt(style.lineHeight);

    document.body.removeChild(div);

    return { x, y };
  }

  // Function to update caret position
  function updateCaretPosition() {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const { x, y } = getCursorPosition(textareaRef.current, cursorPosition);
      setCaretPosition({ x, y });
      // Broadcast cursor movement on key/click as well
      if (socket && currentDoc) {
        socket.emit("cursor", {
          docId: currentDoc.id,
          x,
          y,
          index: cursorPosition,
          isTyping: false,
        });
      }
    }
  }

  // Function to update caret position with typing indicator
  function updateCaretPositionWithTyping() {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const { x, y } = getCursorPosition(textareaRef.current, cursorPosition);
      setCaretPosition({ x, y });

      // Emit cursor position to other users with typing indicator
      if (socket && currentDoc) {
        socket.emit("cursor", {
          docId: currentDoc.id,
          x,
          y,
          index: cursorPosition,
          isTyping: true,
        });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing indicator after 2 seconds
        typingTimeoutRef.current = setTimeout(() => {
          if (socket && currentDoc) {
            socket.emit("cursor", {
              docId: currentDoc.id,
              x,
              y,
              index: cursorPosition,
              isTyping: false,
            });
          }
        }, 2000);
      }
    }
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    updateCaretPositionWithTyping();
    if (socket && currentDoc) {
      socket.emit("edit", {
        docId: currentDoc.id,
        delta: null,
        version: (currentDoc.version ?? 0) + 1,
        content: e.target.value,
      });
      if (user)
        socket.emit("editor:typing", {
          docId: currentDoc.id,
          username: user.username,
        });
    }
  }

  function sendMessage() {
    if (!chatInput.trim() || !socket || !user || !currentDoc) return;
    socket.emit("chat:message", {
      docId: currentDoc.id,
      message: chatInput.trim(),
      user,
    });
    setChatInput("");
  }

  function onChatChange(e: React.ChangeEvent<HTMLInputElement>) {
    setChatInput(e.target.value);
    if (socket && user && currentDoc) {
      socket.emit("chat:typing", {
        docId: currentDoc.id,
        username: user.username,
      });
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async function handleTitleSave() {
    if (!currentDoc || !titleInput.trim()) return;
    try {
      await DocsAPI.update(currentDoc.id, titleInput.trim());
      setCurrentDoc({ ...currentDoc, title: titleInput.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  }

  async function handleDeleteDocument() {
    if (!currentDoc || !user) return;

    // Check if current user is the owner
    if (
      currentDoc.ownerId !== user.id &&
      currentDoc.ownerUserName !== user.username
    ) {
      alert("Only the document owner can delete this document");
      return;
    }

    if (
      confirm(
        "Are you sure you want to delete this document? This action cannot be undone."
      )
    ) {
      try {
        await DocsAPI.delete(currentDoc.id);
        navigate("/");
      } catch (error) {
        console.error("Failed to delete document:", error);
      }
    }
  }

  function isOwner() {
    if (!currentDoc || !user) return false;
    return (
      currentDoc.ownerId === user.id ||
      currentDoc.ownerUserName === user.username
    );
  }

  function getShareUrl() {
    return `${window.location.origin}/doc/${docId}`;
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-semibold">Back to Documents</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            {/* Document title and last updated date and time */}
            <div className="flex flex-col items-start">
              {isEditingTitle ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleTitleSave();
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setTitleInput(currentDoc?.title || "");
                      }
                    }}
                    className="text-sm font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleSave}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTitle(false);
                      setTitleInput(currentDoc?.title || "");
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-sm font-semibold hover:text-blue-600 transition-colors"
                  disabled={!isOwner()}
                >
                  {currentDoc?.title}
                  {isOwner() && <Edit3 className="w-4 h-4 inline ml-1" />}
                </button>
              )}
              <span className="text-sm text-gray-500">
                Last edited: {formatDateTime(currentDoc?.updatedAt || "")}
              </span>
            </div>
          </div>
          {/* Document Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Share document"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowVersionHistory(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Version history"
            >
              <History className="w-5 h-5" />
            </button>
            {isOwner() && (
              <button
                onClick={handleDeleteDocument}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete document"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Toolbar */}
          <div className="bg-white border-b border-gray-200 px-8 py-3 flex justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-5 h-5 mr-2" />
              <span>
                {docUsers.length} active user{docUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="autoSaved flex gap-2 items-center text-gray-600">
              <Save className="w-4 h-4" /> Auto-saved
            </div>
          </div>
          {/* Editor Content */}
          <div className="flex-1 p-8 relative">
            <div className="max-w-6xl mx-auto relative">
              <textarea
                autoFocus
                ref={textareaRef}
                value={content}
                onChange={onChange}
                onKeyUp={updateCaretPositionWithTyping}
                onClick={updateCaretPosition}
                placeholder="Start writing your document..."
                className="w-full h-full resize-none border-none outline-none text-gray-900 text-lg leading-relaxed bg-transparent font-serif relative z-10"
                style={{ minHeight: "calc(100vh - 200px)" }}
              />

              {/* Local Blinking Caret */}
              <div className="absolute inset-0 pointer-events-none z-20">
                <div
                  className="absolute w-0.5 h-6 bg-gray-900 animate-pulse"
                  style={{
                    left: `${caretPosition.x}px`,
                    top: `${caretPosition.y}px`,
                    animation: "blink 1s infinite",
                  }}
                />
              </div>

              {/* Other Users' Cursors */}
              <div className="absolute inset-0 pointer-events-none z-30">
                {cursors
                  .filter((c) => c.userId !== socket?.id)
                  .map((cursor) => {
                    if (cursor.x == null || cursor.y == null) return null;

                    // Generate consistent colors for each user
                    const colors = [
                      "bg-green-500",
                      "bg-purple-500",
                      "bg-blue-500",
                      "bg-red-500",
                      "bg-yellow-500",
                      "bg-pink-500",
                      "bg-indigo-500",
                      "bg-orange-500",
                    ];
                    const colorIndex =
                      cursor.username.charCodeAt(0) % colors.length;
                    const bgColor = colors[colorIndex];

                    return (
                      <div key={cursor.userId} className="absolute">
                        {/* Cursor line */}
                        <div
                          className={`w-0.5 h-6 ${bgColor} animate-pulse`}
                          style={{
                            left: `${cursor.x}px`,
                            top: `${cursor.y}px`,
                            animation: "blink 1s infinite",
                          }}
                        />
                        {/* User name box with typing indicator */}
                        <div
                          className={`absolute ${bgColor} text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg`}
                          style={{
                            left: `${cursor.x + 2}px`,
                            top: `${cursor.y - 24}px`,
                          }}
                        >
                          {cursor.username}
                          {cursor.isTyping ? " (typing...)" : ""}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
          {/* Active Users Section */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Active Users</h3>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{docUsers.length} online</span>
              </div>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {docUsers.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No one else here</p>
                </div>
              ) : (
                docUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${getAvatarColor(
                        u.username
                      )} flex items-center justify-center text-white text-sm font-medium`}
                    >
                      {getInitials(u.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.username}
                      </p>
                      <p className="text-xs text-gray-500">Currently editing</p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Chat</h3>
                </div>
                {typing && (
                  <span className="text-xs text-gray-500 animate-pulse">
                    {typing}
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs text-gray-400">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className="flex space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full ${getAvatarColor(
                        m.user.username
                      )} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
                    >
                      {getInitials(m.user.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {m.user.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(m.createdAt)}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg py-2 max-w-[100%] ">
                        <p className="text-sm text-gray-800 max-w-[100%] line">
                          {m.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex space-x-2">
                <input
                  value={chatInput}
                  onChange={onChatChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Share2 className="w-5 h-5 mr-2" />
                  Share Document
                </h2>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={getShareUrl()}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 mt-2">
                    Link copied to clipboard!
                  </p>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p>Anyone with this link can view and edit this document.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      <VersionHistoryModal
        docId={docId}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onSelectVersion={(version) => {
          setContent(version.content);
          setShowVersionHistory(false);
        }}
      />
    </div>
  );
}
