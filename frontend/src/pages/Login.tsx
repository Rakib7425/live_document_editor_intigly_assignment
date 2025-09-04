import { useState } from "react";
import { AuthAPI } from "../api";
import { useStore } from "../store/store";

export default function Login() {
  const [username, setUsername] = useState("");
  const setUser = useStore((s) => s.setUser);
  const connectSocket = useStore((s) => s.connectSocket);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    const u = await AuthAPI.login(username.trim());
    setUser(u);
    connectSocket();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Live Docs
            </h1>
            <p className="text-gray-600">
              Collaborate in real-time with your team
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a unique username"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
