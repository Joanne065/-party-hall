import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function CalendarPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // 状态筛选：all = 全部, confirmed = 已确定, pending = 待定
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending">("all");

  // 根据筛选状态查询
  const queryParams: { month: string; status?: string } = { month: currentMonth };
  if (statusFilter !== "all") {
    queryParams.status = statusFilter;
  }
  const eventsQuery = trpc.event.list.useQuery(queryParams);

  const calendarEvents =
    eventsQuery.data?.map((evt: { id: number; title: string; date: string; status: string }) => ({
      id: String(evt.id),
      title: evt.title,
      date: evt.date,
      backgroundColor: evt.status === "confirmed" ? "#FF2442" : "#FFB800",
      borderColor: evt.status === "confirmed" ? "#FF2442" : "#FFB800",
      textColor: "#fff",
      extendedProps: evt,
    })) ?? [];

  const handleEventClick = useCallback((info: any) => {
    setSelectedEvent(info.event.extendedProps);
    setDialogOpen(true);
  }, []);

  const handleDatesSet = useCallback((info: any) => {
    const date = info.view.currentStart;
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    setCurrentMonth(month);
  }, []);

  const utils = trpc.useUtils();
  const createMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      utils.event.list.invalidate();
      toast.success("活动创建成功");
    },
  });

  const [newEventOpen, setNewEventOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStatus, setNewStatus] = useState<"confirmed" | "pending">("pending");

  const handleCreateEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    createMutation.mutate({
      title: newTitle,
      date: newDate,
      status: newStatus,
    });
    setNewTitle("");
    setNewDate("");
    setNewEventOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">活动日历</h1>
          <p className="text-xs text-gray-400 mt-0.5">点击活动查看详情</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setNewEventOpen(true)}
            className="h-9 px-4 text-sm font-medium rounded-full bg-red-500 hover:bg-red-600 text-white border-0 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            新建
          </Button>
        )}
      </div>

      {/* 状态筛选 - 可点击切换 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setStatusFilter("all")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
          style={{
            backgroundColor: statusFilter === "all" ? "#FF2442" : "#fff",
            color: statusFilter === "all" ? "#fff" : "#666",
            borderColor: statusFilter === "all" ? "#FF2442" : "#e5e5e5",
          }}
        >
          全部
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "confirmed" ? "all" : "confirmed")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
          style={{
            backgroundColor: statusFilter === "confirmed" ? "#FF2442" : "#fff",
            color: statusFilter === "confirmed" ? "#fff" : "#666",
            borderColor: statusFilter === "confirmed" ? "#FF2442" : "#e5e5e5",
          }}
        >
          {statusFilter === "confirmed" && <Check className="w-3 h-3" />}
          <span className="w-2 h-2 rounded-full bg-red-500" />
          已确定
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
          style={{
            backgroundColor: statusFilter === "pending" ? "#FFB800" : "#fff",
            color: statusFilter === "pending" ? "#fff" : "#666",
            borderColor: statusFilter === "pending" ? "#FFB800" : "#e5e5e5",
          }}
        >
          {statusFilter === "pending" && <Check className="w-3 h-3" />}
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          待定
        </button>
      </div>

      {/* FullCalendar */}
      <div className="rounded-2xl overflow-hidden border border-gray-100">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{ today: "今天" }}
          locale="zh-cn"
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
          dayCellClassNames={() => "hover:bg-red-50/30 transition-colors"}
          dayHeaderClassNames={() => "text-xs font-normal text-gray-400 uppercase"}
          titleFormat={{ year: "numeric", month: "long" }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit" }}
        />
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-white border-0 rounded-2xl p-0 overflow-hidden">
          <div className="p-5">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-base font-bold text-gray-900">
                {selectedEvent?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${selectedEvent.status === "confirmed" ? "bg-red-500" : "bg-yellow-400"}`}>
                    {selectedEvent.status === "confirmed" ? "已确定" : "待定"}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-500">
                  {selectedEvent.date && <p>📅 {selectedEvent.date}</p>}
                  {selectedEvent.location && <p>📍 {selectedEvent.location}</p>}
                </div>
                {selectedEvent.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">#{tag}</span>
                    ))}
                  </div>
                )}
                <Button
                  onClick={() => { setDialogOpen(false); navigate(`/events/${selectedEvent.id}`); }}
                  className="w-full h-9 text-sm rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  查看详情
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">新建活动</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">活动标题</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none" placeholder="输入活动标题..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">日期</label>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">状态</label>
              <div className="flex gap-2">
                {(["pending", "confirmed"] as const).map((s) => (
                  <button key={s} onClick={() => setNewStatus(s)} className="flex-1 h-9 rounded-full text-xs border transition-colors" style={{ backgroundColor: newStatus === s ? (s === "confirmed" ? "#FF2442" : "#fff") : "#fff", color: newStatus === s ? (s === "confirmed" ? "#fff" : "#999") : "#999", borderColor: newStatus === s ? (s === "confirmed" ? "#FF2442" : "#e5e5e5") : "#e5e5e5" }}>
                    {s === "confirmed" ? "已确定" : "待定"}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreateEvent} disabled={!newTitle.trim() || !newDate || createMutation.isPending} className="w-full h-10 text-sm rounded-full bg-red-500 hover:bg-red-600 text-white border-0">
              {createMutation.isPending ? "创建中..." : "创建活动"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .fc { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif; }
        .fc-theme-standard .fc-scrollgrid { border-color: #f0f0f0; }
        .fc-theme-standard td, .fc-theme-standard th { border-color: #f0f0f0; }
        .fc .fc-daygrid-day-number { color: #666; font-size: 0.8rem; padding: 6px; }
        .fc .fc-col-header-cell-cushion { color: #999; padding: 8px 4px; }
        .fc .fc-button-primary { background-color: #f5f5f5 !important; border: none !important; color: #666 !important; font-size: 0.8rem !important; padding: 6px 12px !important; border-radius: 9999px !important; }
        .fc .fc-button-primary:hover { background-color: #eee !important; }
        .fc .fc-button-primary:not(:disabled):active { background-color: #e5e5e5 !important; }
        .fc .fc-toolbar-title { color: #333; font-size: 1.1rem; font-weight: 700; }
        .fc-event { cursor: pointer; border: none !important; padding: 2px 6px; font-size: 0.75rem; border-radius: 9999px !important; }
        .fc .fc-daygrid-day-frame { min-height: 80px; }
        .fc .fc-day-today { background-color: rgba(255,36,66,0.03) !important; }
        .fc .fc-daygrid-more-link { color: #999; font-size: 0.72rem; }
      `}</style>
    </div>
  );
}
