import { FileText, Users, Clock } from "lucide-react";

interface DocumentCardProps {
  title: string;
  author: string;
  preview: string;
  usersCount: number;
  lastUpdated: string;
  avatars: string[]; // initials or avatar colors
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
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
              {title}
            </h3>
            <p className="text-sm text-gray-500">by {author}</p>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4 line-clamp-2">{preview}</div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>{usersCount}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{lastUpdated}</span>
          </div>
        </div>
        <div className="flex -space-x-1">
          {avatars.map((a, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: a }}
            >
              A
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
