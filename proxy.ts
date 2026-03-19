// middleware.ts
import { withAuth } from "next-auth/middleware";

// 使用 withAuth 可以讓你自定義一些行為，例如權限判斷
export default withAuth({
  pages: {
    signIn: "/api/auth/signin", // 或者你的自定義登入頁
  },
});

export const config = {
  // 設定哪些路徑需要登入才能看
  // 這裡保護首頁、訂單頁、庫存頁、採購頁
  matcher: ["/", "/orders/:path*", "/inventory/:path*", "/purchases/:path*"],
};
