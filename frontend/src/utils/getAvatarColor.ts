export const getAvatarColor = (username: string) => {
  const colors = [
    "bg-red-500",
    "bg-green-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-yellow-500",
    "bg-pink-500",
  ];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
};
