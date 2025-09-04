import { Routes, Route, Navigate, Link, useParams } from "react-router-dom";
import Login from "./pages/Login";
import Documents from "./pages/Documents";
import Editor from "./pages/Editor";
import { useStore } from "./store";
import ActiveUsers from "./components/ActiveUsers";

// Wrapper component for Editor to extract docId from URL params
function EditorWrapper() {
  const { docId } = useParams<{ docId: string }>();
  return <Editor docId={Number(docId)} />;
}

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Public Route component (redirect to documents if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>
                <header className="bg-white border-b border-gray-200">
                  <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                      <Link to="/" className="text-2xl font-bold text-gray-900">
                        Live Docs
                      </Link>
                      <div className="flex items-center space-x-6">
                        <ActiveUsers />
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-600">
                            {user ? `Signed in as ${user.username}` : ""}
                          </div>
                          {user && (
                            <button
                              onClick={logout}
                              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Logout
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </header>
                <main>
                  <Documents />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Editor route - no header */}
        <Route
          path="/doc/:docId"
          element={
            <ProtectedRoute>
              <EditorWrapper />
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
