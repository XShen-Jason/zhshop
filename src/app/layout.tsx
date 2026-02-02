import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/lib/GlobalToast";
import { ConfirmProvider } from "@/lib/ConfirmContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "智汇商城 - 一站式数字商品交易平台",
  description: "提供优质教程、拼车合租与积分抽奖服务的一站式数字商品交易平台",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        <ConfirmProvider>
          <ToastProvider>
            <Navbar user={user} />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </ConfirmProvider>
      </body>
    </html>
  );
}
