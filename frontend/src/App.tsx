import { Routes, Route, Navigate, Link, useParams } from "react-router-dom";
import Login from "./pages/Login";
import Documents from "./pages/Documents";
import Editor from "./pages/Editor";
import { useStore } from "./store/store";
// import ActiveUsers from "./components/ActiveUsers";

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
                        {/* <ActiveUsers /> */}
                        <div className="flex items-center justify-center space-x-4">
                          <div className="text-sm text-gray-600">
                            Signed in as
                            <span className="font-bold text-orange-600">
                              {user ? ` ${user.username}` : ""}
                            </span>
                          </div>
                          {user && (
                            <button
                              onClick={logout}
                              className="relative inline-flex items-center justify-center overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400  hover:from-pink-500 hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800 hover:bg-transparent"
                            >
                              <span className="relative px-4 py-2  transition-all ease-in duration-75   rounded-md  hover:dark:bg-transparent">
                                Logout
                              </span>
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
