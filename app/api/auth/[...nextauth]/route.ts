import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma"; // 引入我們之前寫好的 Prisma 連線

const handler = NextAuth({
  adapter: PrismaAdapter(prisma), // 告訴 NextAuth 把資料存進 Prisma
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt", // 使用 JWT 來管理登入狀態，對 Serverless 最友善
  },
  callbacks: {
    // 這裡可以自訂回傳給前端的 session 資料
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // 把資料庫的 User ID 塞進 session 給前端用
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
