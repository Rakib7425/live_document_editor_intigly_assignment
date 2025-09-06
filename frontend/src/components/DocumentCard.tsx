import { FileText, Users, Clock } from "lucide-react";

interface DocumentCardProps {
  title: string;
  author: string;
  preview: string;
  usersCount: number;
  lastUpdated: string;
  avatars: string[];
  onClick: () => void;
}

export default function DocumentCard({
  title,
  author,
  preview,
  usersCount,
  lastUpdated,
  avatars,
  onClick,
}: DocumentCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-200 cursor-pointer group relative overflow-hidden"
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                {title}
              </h3>
              <p className="text-sm text-gray-500">
                by {author}
              </p>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
            {preview}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{usersCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{lastUpdated}</span>
            </div>
          </div>

          {/* Active Users */}
          <div className="flex -space-x-2">
            {avatars.map((a, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium group-hover:scale-110 transition-transform duration-200"
                style={{ backgroundColor: a, transitionDelay: `${i * 50}ms` }}
              >
                A
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
