import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Documents from "./pages/Documents";
import Editor from "./pages/Editor";
import { useStore } from "./store";
import ActiveUsers from "./components/ActiveUsers";

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);

  let page: JSX.Element;
  if (!user) page = <Login />;
  else if (hash.startsWith("#/doc/")) {
    const id = Number(hash.replace("#/doc/", ""));
    page = <Editor docId={id} />;
  } else page = <Documents />;

  // For editor page, don't show the main header
  if (hash.startsWith("#/doc/")) {
    return page;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="#/" className="text-2xl font-bold text-gray-900">
              Live Docs
            </a>
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
      <main>{page}</main>
    </div>
  );
}
