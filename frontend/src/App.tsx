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
