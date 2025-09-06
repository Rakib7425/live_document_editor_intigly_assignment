import { useState } from "react";
import { AuthAPI } from "../api";
import { useStore } from "../store/store";
import { FileText, Users, Zap, ArrowRight, Loader2, User } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const setUser = useStore((s) => s.setUser);
  const connectSocket = useStore((s) => s.connectSocket);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    
    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters long");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const u = await AuthAPI.login(username.trim());
      setUser(u);
      connectSocket();
    } catch (err) {
      setError("Failed to login. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Feature Showcase */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              <Zap className="w-4 h-4" />
              Real-time Collaboration
            </div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Create, Edit & 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Collaborate
              </span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Experience seamless document editing with your team in real-time. 
              Share ideas, make changes, and watch your documents come to life together.
            </p>
          </div>
          
          {/* Feature Cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Smart Documents</h3>
                <p className="text-gray-600 text-sm">Create and organize documents with intelligent formatting and structure.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Team Collaboration</h3>
                <p className="text-gray-600 text-sm">See who's online, track changes, and collaborate seamlessly with your team.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 lg:p-10">
            {/* Logo and Welcome */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Live Docs
              </h2>
              <p className="text-gray-600">
                Enter your username to get started with collaborative editing
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (error) setError("");
                    }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                      error ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="Enter your unique username"
                    disabled={isLoading}
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-2 text-red-600 text-sm mt-2">
                    <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                    </div>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 disabled:transform-none disabled:cursor-not-allowed group flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Getting Started...</span>
                  </>
                ) : (
                  <>
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
            
            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-sm text-gray-500">
                Your username will be visible to other collaborators in shared documents
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
