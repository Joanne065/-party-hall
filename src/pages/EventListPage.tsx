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
import { listThumbnailUrl } from "@/lib/imageUrl";

type GroupedDiscoveryEvent = {
  groupKey: string;
  title: string;
  dates: string[];
  primaryId: number;
  status: "confirmed" | "pending";
  coverRawUrl: string | null;
};

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 含未来场次：按「最近一场」由近到远；仅过去：按「最近一场」由近到远（日期大的在前） */
function sortGroupsByNearestDateFirst(groups: GroupedDiscoveryEvent[]): GroupedDiscoveryEvent[] {
  const t = todayYMD();
  function tierAndKey(dates: string[]): [0 | 1, string] {
    const sorted = [...dates].sort();
    const upcoming = sorted.filter((d) => d >= t);
    if (upcoming.length > 0) {
      return [0, upcoming[0]];
    }
    const past = sorted.filter((d) => d < t);
    const key = past.length > 0 ? past[past.length - 1] : sorted[sorted.length - 1];
    return [1, key];
  }
  return [...groups].sort((a, b) => {
    const [ta, ka] = tierAndKey(a.dates);
    const [tb, kb] = tierAndKey(b.dates);
    if (ta !== tb) return ta - tb;
    if (ta === 0) return ka.localeCompare(kb);
    return kb.localeCompare(ka);
  });
}

function groupEventsByTitle(raw: any[]): GroupedDiscoveryEvent[] {
  const map = new Map<string, any[]>();
  for (const e of raw) {
    const key = String(e.title ?? "").trim();
    const bucketKey = key.length ? key : `__id_${e.id}`;
    if (!map.has(bucketKey)) map.set(bucketKey, []);
    map.get(bucketKey)!.push(e);
  }
  const groups: GroupedDiscoveryEvent[] = [];
  for (const [, evts] of map) {
    const sorted = [...evts].sort((a, b) => a.date.localeCompare(b.date));
    const anyConfirmed = sorted.some((x) => x.status === "confirmed");
    const coverSource =
      sorted.find((x) => x.coverImage || (x.photos?.length ?? 0) > 0) ?? sorted[0];
    const coverRawUrl =
      coverSource.coverImage ||
      (coverSource.photos?.length ? coverSource.photos[0].url : null);
    groups.push({
      groupKey: sorted.map((x: { id: number }) => x.id).sort((a, b) => a - b).join("-"),
      title: sorted[0].title,
      dates: sorted.map((x: { date: string }) => x.date),
      primaryId: sorted[0].id,
      status: anyConfirmed ? "confirmed" : "pending",
      coverRawUrl,
    });
  }
  return sortGroupsByNearestDateFirst(groups);
}

/* ===== 瀑布流两列布局 ===== */
function WaterfallGrid({ groups }: { groups: GroupedDiscoveryEvent[] }) {
  const navigate = useNavigate();

  const leftCol: typeof groups = [];
  const rightCol: typeof groups = [];
  let leftH = 0;
  let rightH = 0;

  groups.forEach((g) => {
    const hasImg = !!g.coverRawUrl;
    const extraDates = Math.max(0, g.dates.length - 1);
    const h = (hasImg ? 320 : 180) + extraDates * 16;
    if (leftH <= rightH) {
      leftCol.push(g);
      leftH += h;
    } else {
      rightCol.push(g);
      rightH += h;
    }
  });

  return (
    <div className="flex gap-3 px-4">
      <div className="flex-1 flex flex-col gap-3">
        {leftCol.map((g) => (
          <WaterfallCard
            key={g.groupKey}
            group={g}
            onClick={() => navigate(`/events/${g.primaryId}`)}
          />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-3">
        {rightCol.map((g) => (
          <WaterfallCard
            key={g.groupKey}
            group={g}
            onClick={() => navigate(`/events/${g.primaryId}`)}
          />
        ))}
      </div>
    </div>
  );
}

/* ===== 瀑布流卡片 ===== */
function WaterfallCard({
  group,
  onClick,
}: {
  group: GroupedDiscoveryEvent;
  onClick: () => void;
}) {
  const thumb = listThumbnailUrl(group.coverRawUrl);
  const hasImage = !!thumb;
  const statusText = group.status === "confirmed" ? "已确定" : "待定";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.98]"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {hasImage ? (
        <div className="relative overflow-hidden">
          <img
            src={thumb}
            alt={group.title}
            className="w-full object-cover"
            style={{ aspectRatio: "3/4" }}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute top-2 right-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${group.status === "confirmed" ? "bg-red-500" : "bg-gray-400"}`}
            >
              {statusText}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative w-full flex items-center justify-center bg-gray-50" style={{ aspectRatio: "3/4" }}>
          <CalendarDays className="w-10 h-10 text-gray-200" />
          <div className="absolute top-2 right-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${group.status === "confirmed" ? "bg-red-500" : "bg-gray-400"}`}
            >
              {statusText}
            </span>
          </div>
        </div>
      )}

      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-1.5">
          {group.title}
        </h3>
        <div className="space-y-1">
          {group.dates.map((d) => (
            <div key={d} className="flex items-center gap-1 text-xs text-gray-400">
              <CalendarDays className="w-3 h-3 shrink-0" />
              <span>{d}</span>
            </div>
          ))}
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

  const groupedEvents = groupEventsByTitle(filteredEvents);

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
      {groupedEvents.length > 0 ? (
        <WaterfallGrid groups={groupedEvents} />
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
