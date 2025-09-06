import { useEffect, useState } from "react";
import { AuthAPI } from "../api";

export default function ActiveUsers() {
  const [users, setUsers] = useState<string[]>([]);
  useEffect(() => {
    AuthAPI.active().then((r) => setUsers(r.users));
  }, []);
  return (
    <div className="text-sm text-gray-700">
      Active now: {users.join(", ") || "—"}
    </div>
  );
}
