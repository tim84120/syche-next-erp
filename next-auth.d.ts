import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * 擴展 session.user 的型別
   */
  interface Session {
    user: {
      /** 使用者的資料庫 ID */
      id: string;
      /** 使用者的權限角色 (如果你有加的話) */
      role?: string;
    } & DefaultSession["user"];
  }

  /**
   * 擴展 User 物件本身 (選填，視需求而定)
   */
  interface User {
    id: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  /** 擴展 JWT token 裡的型別 */
  interface JWT {
    id: string;
    role?: string;
  }
}
