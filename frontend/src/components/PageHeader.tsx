import { Plus } from "lucide-react";

export default function PageHeader({
  onNewDocument,
}: {
  onNewDocument: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Documents</h2>
        <p className="text-gray-600 mt-1">
          Collaborate in real-time with your team
        </p>
      </div>
      <button
        onClick={onNewDocument}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md"
      >
        <Plus className="w-4 h-4" />
        <span>New Document</span>
      </button>
    </div>
  );
}
