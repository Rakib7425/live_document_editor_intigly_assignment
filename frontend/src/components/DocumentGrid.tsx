import DocumentCard from "./DocumentCard";

export default function DocumentGrid({ documents }: { documents: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          title={doc.title}
          author={doc.author}
          preview={doc.preview}
          usersCount={doc.usersCount}
          lastUpdated={doc.lastUpdated}
          avatars={doc.avatars}
          onClick={() => console.log("Open", doc.id)}
        />
      ))}
    </div>
  );
}
