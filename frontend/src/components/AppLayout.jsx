import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import BackgroundOrbs from "./BackgroundOrbs";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <BackgroundOrbs />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-[var(--color-text-faint)] py-6">
        Made by Dhruv Kulshrestha ·{" "}
        <a
          href="https://github.com/REPLACE_WITH_YOUR_GITHUB_USERNAME/reviseorbit"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--color-text-dim)] underline underline-offset-2"
        >
          GitHub Repository
        </a>
      </footer>
    </div>
  );
}
