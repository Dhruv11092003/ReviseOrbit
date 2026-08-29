import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import BackgroundOrbs from "./BackgroundOrbs";

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <BackgroundOrbs />
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
