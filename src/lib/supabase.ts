import { createClient } from "@supabase/supabase-js";

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** 是否配置了 Supabase（未配置时降级为纯 Demo 模式） */
export const HAS_SUPABASE = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = HAS_SUPABASE
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/** 生成或读取设备唯一标识（存在 localStorage） */
export function getDeviceToken(): string {
  const key = "track_player_device_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}
