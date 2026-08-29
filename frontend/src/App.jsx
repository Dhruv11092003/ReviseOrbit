import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Pending from "./pages/Pending";
import AddRevision from "./pages/AddRevision";
import AllTasks from "./pages/AllTasks";

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function RedirectIfAuthed({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/signin"
          element={
            <RedirectIfAuthed>
              <PageTransition>
                <Signin />
              </PageTransition>
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <PageTransition>
                <Signup />
              </PageTransition>
            </RedirectIfAuthed>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <PageTransition>
                <Dashboard />
              </PageTransition>
            }
          />
          <Route
            path="/today"
            element={
              <PageTransition>
                <Today />
              </PageTransition>
            }
          />
          <Route
            path="/pending"
            element={
              <PageTransition>
                <Pending />
              </PageTransition>
            }
          />
          <Route
            path="/add"
            element={
              <PageTransition>
                <AddRevision />
              </PageTransition>
            }
          />
          <Route
            path="/all"
            element={
              <PageTransition>
                <AllTasks />
              </PageTransition>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--toast-bg)",
              color: "var(--toast-text)",
              border: "1px solid var(--toast-border)",
              fontSize: "13.5px",
            },
            success: { iconTheme: { primary: "#34d399", secondary: "#0a0e1a" } },
            error: { iconTheme: { primary: "#f8748a", secondary: "#0a0e1a" } },
          }}
        />
        <AnimatedRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
