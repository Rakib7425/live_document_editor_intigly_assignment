import { FileText } from "lucide-react";

export default function Header({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => void;
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">CollabWrite</h1>
          </div>

          {/* User + Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-gray-700">
                {username}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
