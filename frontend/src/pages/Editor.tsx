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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      if (!socket) connectSocket();
      const { doc, messages } = await DocsAPI.get(docId);
      setCurrentDoc(doc);
      setContent(doc.content || "");
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
    return () => {
      socket.emit("leaveDoc", { docId });
      socket.off("typing", onTyping);
    };
  }, [socket, user, currentDoc, docId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to calculate exact cursor position
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
    const textAfterCursor = textarea.value.substring(cursorIndex);

    // Create a span for the cursor position
    const span = document.createElement("span");
    span.textContent = "|"; // Cursor character

    // Split text into lines and find the current line
    const lines = textBeforeCursor.split("\n");
    const currentLine = lines.length - 1;
    const currentLineText = lines[currentLine];

    // Create the text content up to cursor
    div.innerHTML =
      textBeforeCursor.replace(/\n/g, "<br>") +
      span.outerHTML +
      textAfterCursor.replace(/\n/g, "<br>");

    // Get the position of the cursor span
    const rect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();

    const x = rect.left - textareaRect.left;
    const y = rect.top - textareaRect.top;

    document.body.removeChild(div);

    return { x, y };
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
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

      // Track cursor position and emit cursor data
      const textarea = e.target;
      const cursorPosition = textarea.selectionStart;

      // Calculate exact cursor position
      const { x, y } = getCursorPosition(textarea, cursorPosition);

      socket.emit("cursor", {
        docId: currentDoc.id,
        cursor: { x, y, isTyping: true },
      });

      // Clear typing status after a delay
      setTimeout(() => {
        socket.emit("cursor", {
          docId: currentDoc.id,
          cursor: { x, y, isTyping: false },
        });
      }, 1000);
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

  function getCursorColor(username: string) {
    const colors = [
      "#ef4444", // red-500
      "#10b981", // green-500
      "#3b82f6", // blue-500
      "#8b5cf6", // purple-500
      "#eab308", // yellow-500
      "#ec4899", // pink-500
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
            {/* //document title  and last updated date and time*/}
            <div className="flex flex-col items-start  ">
              <span className="text-sm font-semibold  ">
                {currentDoc?.title}
              </span>
              <span className="text-sm text-gray-500">
                Last edited: {formatDateTime(currentDoc?.updatedAt || "")}
              </span>
            </div>
          </div>
          {/* Document Actions */}
          <div className="flex items-center space-x-3">
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
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
                onMouseMove={(e) => {
                  if (socket && currentDoc && user) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    socket.emit("cursor", {
                      docId: currentDoc.id,
                      cursor: { x, y, isTyping: false },
                    });
                  }
                }}
                onKeyUp={(e) => {
                  if (socket && currentDoc && user) {
                    const textarea = e.currentTarget;
                    const cursorPosition = textarea.selectionStart;

                    // Calculate exact cursor position
                    const { x, y } = getCursorPosition(
                      textarea,
                      cursorPosition
                    );

                    socket.emit("cursor", {
                      docId: currentDoc.id,
                      cursor: { x, y, isTyping: false },
                    });
                  }
                }}
                onClick={(e) => {
                  if (socket && currentDoc && user) {
                    const textarea = e.currentTarget;
                    const cursorPosition = textarea.selectionStart;

                    // Calculate exact cursor position
                    const { x, y } = getCursorPosition(
                      textarea,
                      cursorPosition
                    );

                    socket.emit("cursor", {
                      docId: currentDoc.id,
                      cursor: { x, y, isTyping: false },
                    });
                  }
                }}
                placeholder="Start writing your document..."
                className="w-full h-full resize-none border-none outline-none text-gray-900 text-lg leading-relaxed bg-transparent font-serif relative z-10"
                style={{ minHeight: "calc(100vh - 200px)" }}
              />

              {/* Live Cursors Overlay */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {Object.entries(cursors).map(([userId, cursorData]) => {
                  if (!cursorData || !cursorData.username) return null;

                  const { username, x, y, isTyping } = cursorData;

                  return (
                    <div
                      key={userId}
                      className="absolute transition-all duration-150 ease-out"
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: "translateY(-2px)",
                      }}
                    >
                      {/* Cursor Line */}
                      <div
                        className="w-0.5 h-6 absolute"
                        style={{
                          backgroundColor: getCursorColor(username),
                        }}
                      />

                      {/* User Name Bubble */}
                      <div
                        className="absolute -top-8 left-0 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
                        style={{
                          backgroundColor: getCursorColor(username),
                        }}
                      >
                        {username}
                        {isTyping && (
                          <span className="ml-1 animate-pulse">
                            (typing...)
                          </span>
                        )}
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
