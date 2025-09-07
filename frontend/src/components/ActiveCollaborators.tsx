import { UserCheck } from "lucide-react";
import React from "react";
import { getAvatarColor } from "../utils/getAvatarColor";
import { getInitials } from "../utils/getInitials";

interface ActiveCollaboratorsProps {
  activeUsers: string[];
  user?: {
    username: string;
  };
}

const ActiveCollaborators: React.FC<ActiveCollaboratorsProps> = ({
  activeUsers,
  user,
}) => {
  return (
    <>
      {activeUsers.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Active Collaborators
                </h3>
                <p className="text-sm text-gray-500">
                  {activeUsers.length} user
                  {activeUsers.length !== 1 ? "s" : ""} currently online
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {activeUsers.map((username) => (
              <div
                key={username}
                className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg px-3 py-2"
              >
                <div
                  className={`w-7 h-7 rounded-full ${getAvatarColor(
                    username
                  )} flex items-center justify-center text-white text-sm font-medium`}
                >
                  {getInitials(username)}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {username}
                </span>
                {username === user?.username && (
                  <span className="text-xs text-green-600 font-medium">
                    (you)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveCollaborators;
