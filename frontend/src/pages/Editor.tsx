import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { DocsAPI } from "../api";
import { User } from "lucide-react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
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
      const { userId, delta, version } = event.detail;

      // Don't apply our own edits
      if (userId === socket?.id) return;

      // For now, we'll use a simple approach: fetch the latest document content
      // In a more sophisticated implementation, we'd apply the delta
      if (currentDoc) {
        DocsAPI.get(currentDoc.id).then(({ doc }) => {
          setContent(doc.content || "");
          setCurrentDoc(doc);
        });
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
    }
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    updateCaretPosition();
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

      // Broadcast cursor position
      const cursorPosition = e.target.selectionStart;
      const { x, y } = getCursorPosition(e.target, cursorPosition);
      socket.emit("cursor", {
        docId: currentDoc.id,
        x,
        y,
        isTyping: true,
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="text-sm font-semibold  ">Back to Documents</span>
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
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 28 28"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTitle(false);
                      setTitleInput(currentDoc?.title || "");
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 28 28"
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
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-sm font-semibold hover:text-blue-600 transition-colors"
                  disabled={!isOwner()}
                >
                  {currentDoc?.title}
                  {isOwner() && (
                    <svg
                      className="w-4 h-4 inline ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  )}
                </button>
              )}
              <span className="text-sm text-gray-500">
                Last edited: {formatDateTime(currentDoc?.updatedAt || "")}
              </span>
            </div>
          </div>
          {/* Document Actions */}
          <div className="flex items-center space-x-3">
            {isOwner() && (
              <button
                onClick={handleDeleteDocument}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete document"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Toolbar */}
          <div className="bg-white border-b border-gray-200 px-8 py-3">
            <div className="flex text-sm text-gray-600">
              <User className="w-5 h-5" />{" "}
              <span>
                {docUsers.length} active user{docUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 p-8 relative">
            <div className="max-w-6xl mx-auto relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={onChange}
                onKeyUp={updateCaretPosition}
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
                {cursors.map((cursor) => (
                  <div key={cursor.userId} className="absolute">
                    <div
                      className="w-0.5 h-6 bg-blue-500 animate-pulse"
                      style={{
                        left: `${cursor.x}px`,
                        top: `${cursor.y}px`,
                        animation: "blink 1s infinite",
                      }}
                    />
                    <div
                      className="absolute top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                      style={{
                        left: `${cursor.x}px`,
                        top: `${cursor.y + 6}px`,
                      }}
                    >
                      {cursor.username}
                    </div>
                  </div>
                ))}
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
                <h3 className="font-semibold text-gray-900">Chat</h3>
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
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
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
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
