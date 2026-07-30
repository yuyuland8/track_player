import type { Friend } from "../types";

export const ME_ID = "me";
/** star crossing night 的默契主角好友 */
export const BESTIE_ID = "ajie";
export const MAX_ON_TRACK = 8;

export const ME: Friend = {
  id: ME_ID,
  name: "我",
  color: "#169AF3",
  relationDays: 0,
  baseMinutes: 126,
  baseLaps: 42,
  baseHighFives: 0,
  isMe: true,
};

export const FRIENDS: Friend[] = [
  { id: "ajie", name: "阿杰", color: "#FF8A5C", relationDays: 86, baseMinutes: 126, baseLaps: 42, baseHighFives: 8 },
  { id: "momo", name: "茉茉", color: "#F473B9", relationDays: 214, baseMinutes: 98, baseLaps: 35, baseHighFives: 6 },
  { id: "tang", name: "糖糖", color: "#FFC53D", relationDays: 61, baseMinutes: 74, baseLaps: 27, baseHighFives: 5 },
  { id: "kai", name: "阿凯", color: "#8B7CF6", relationDays: 132, baseMinutes: 66, baseLaps: 24, baseHighFives: 4 },
  { id: "yuyu", name: "小雨", color: "#2EC4B6", relationDays: 45, baseMinutes: 52, baseLaps: 19, baseHighFives: 3 },
  { id: "lele", name: "乐乐", color: "#5B8DEF", relationDays: 178, baseMinutes: 47, baseLaps: 17, baseHighFives: 3 },
  { id: "nana", name: "娜娜", color: "#FF6B81", relationDays: 23, baseMinutes: 31, baseLaps: 12, baseHighFives: 2 },
  { id: "chen", name: "小晨", color: "#7BC96F", relationDays: 302, baseMinutes: 25, baseLaps: 9, baseHighFives: 1 },
];

export const ALL_ROLES: Friend[] = [ME, ...FRIENDS];

export function friendById(id: string): Friend {
  const found = ALL_ROLES.find((f) => f.id === id);
  if (!found) throw new Error(`unknown friend: ${id}`);
  return found;
}
