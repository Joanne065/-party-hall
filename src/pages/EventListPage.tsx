import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ===== 瀑布流两列布局 ===== */
function WaterfallGrid({ events }: { events: any[] }) {
  const navigate = useNavigate();

  const leftCol: typeof events = [];
  const rightCol: typeof events = [];
  let leftH = 0;
  let rightH = 0;

  events.forEach((evt) => {
    const hasImg = !!(evt.coverImage || (evt.photos && evt.photos.length > 0));
    const h = hasImg ? 320 : 180;
    if (leftH <= rightH) { leftCol.push(evt); leftH += h; }
    else { rightCol.push(evt); rightH += h; }
  });

  return (
    <div className="flex gap-3 px-4">
      <div className="flex-1 flex flex-col gap-3">
        {leftCol.map((evt) => <WaterfallCard key={evt.id} event={evt} onClick={() => navigate(`/events/${evt.id}`)} />)}
      </div>
      <div className="flex-1 flex flex-col gap-3">
        {rightCol.map((evt) => <WaterfallCard key={evt.id} event={evt} onClick={() => navigate(`/events/${evt.id}`)} />)}
      </div>
    </div>
  );
}

/* ===== 瀑布流卡片 ===== */
function WaterfallCard({ event, onClick }: { event: any; onClick: () => void }) {
  // 封面取 coverImage 或第一张照片
  const coverUrl = event.coverImage || (event.photos && event.photos.length > 0 ? event.photos[0].url : null);
  const hasImage = !!coverUrl;
  const statusText = event.status === "confirmed" ? "已确定" : "待定";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.98]"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {hasImage ? (
        <div className="relative overflow-hidden">
          <img
            src={coverUrl}
            alt={event.title}
            className="w-full object-cover"
            style={{ aspectRatio: "3/4" }}
            loading="lazy"
          />
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${event.status === "confirmed" ? "bg-red-500" : "bg-gray-400"}`}>
              {statusText}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative w-full flex items-center justify-center bg-gray-50" style={{ aspectRatio: "3/4" }}>
          <CalendarDays className="w-10 h-10 text-gray-200" />
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${event.status === "confirmed" ? "bg-red-500" : "bg-gray-400"}`}>
              {statusText}
            </span>
          </div>
        </div>
      )}

      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-1.5">
          {event.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <CalendarDays className="w-3 h-3" />
          <span>{event.date}</span>
        </div>
      </div>
    </div>
  );
}

export function EventListPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [newEventOpen, setNewEventOpen] = useState(false);

  const eventsQuery = trpc.event.list.useQuery({});
  const utils = trpc.useUtils();
  const createMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      utils.event.list.invalidate();
      toast.success("活动创建成功");
      setNewEventOpen(false);
    },
  });

  const filteredEvents =
    eventsQuery.data?.filter((evt: { title: string }) => {
      if (!search) return true;
      return evt.title.toLowerCase().includes(search.toLowerCase());
    }) ?? [];

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStatus, setNewStatus] = useState<"confirmed" | "pending">("pending");

  const handleCreate = () => {
    if (!newTitle.trim() || !newDate) return;
    createMutation.mutate({
      title: newTitle,
      date: newDate,
      location: newLocation || undefined,
      status: newStatus,
    });
    setNewTitle("");
    setNewDate("");
    setNewLocation("");
    setNewStatus("pending");
  };

  return (
    <div className="max-w-2xl mx-auto pb-8 bg-white min-h-screen">
      {/* Header + Search */}
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索活动..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-gray-50 border-0 rounded-full outline-none text-gray-700 placeholder:text-gray-300"
          />
        </div>
        {isAdmin && (
          <Button
            onClick={() => setNewEventOpen(true)}
            className="h-9 w-9 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white border-0 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Waterfall Grid */}
      {filteredEvents.length > 0 ? (
        <WaterfallGrid events={filteredEvents} />
      ) : (
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-200" />
          <p className="text-sm text-gray-400">暂无活动</p>
          {isAdmin && (
            <button onClick={() => setNewEventOpen(true)} className="mt-2 text-sm text-red-500 hover:text-red-600">
              创建第一场活动
            </button>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
        <DialogContent className="sm:max-w-md bg-white border-0 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-bold">新建活动</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">活动标题 *</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none text-gray-900" placeholder="输入活动标题..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">日期 *</label>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none text-gray-900" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">地点</label>
              <input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none text-gray-900" placeholder="输入活动地点..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">状态</label>
              <div className="flex gap-2">
                {(["pending", "confirmed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setNewStatus(s)}
                    className="flex-1 h-9 rounded-full text-xs border transition-colors"
                    style={{
                      backgroundColor: newStatus === s ? (s === "confirmed" ? "#FF2442" : "#fff") : "#fff",
                      color: newStatus === s ? (s === "confirmed" ? "#fff" : "#999") : "#999",
                      borderColor: newStatus === s ? (s === "confirmed" ? "#FF2442" : "#e5e5e5") : "#e5e5e5",
                    }}
                  >
                    {s === "confirmed" ? "已确定" : "待定"}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || !newDate || createMutation.isPending} className="w-full h-11 text-sm font-medium rounded-full border-0 bg-red-500 hover:bg-red-600 text-white">
              {createMutation.isPending ? "创建中..." : "创建活动"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
