import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { PasswordGate } from "@/pages/PasswordGate";
import { Layout } from "@/components/Layout";
import { CalendarPage } from "@/pages/CalendarPage";
import { EventListPage } from "@/pages/EventListPage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  const { isAuthed, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return <PasswordGate />;
  }

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/events" element={<EventListPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
