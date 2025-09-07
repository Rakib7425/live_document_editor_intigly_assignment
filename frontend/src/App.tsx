import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
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
  const [isInitializing, setIsInitializing] = useState(true);
  // const user = useStore((s) => s.user);
  // const logout = useStore((s) => s.logout);
  const initializeUser = useStore((s) => s.initializeUser);

  useEffect(() => {
    const init = async () => {
      await initializeUser();
      setIsInitializing(false);
    };
    init();
  }, [initializeUser]);

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

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
              <main>
                <Documents />
              </main>
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
