import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useImageCompress } from "@/hooks/useImageCompress";
import {
  ArrowLeft, Copy, Pencil, Trash2, Upload, X, Download,
  MapPin, CalendarDays, Users, Sparkles, Lightbulb,
  Image, Camera, Check, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type EventDetail = {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  tags: string[] | null;
  status: "confirmed" | "pending";
  coverImage: string | null;
  photos: { id: number; url: string; filename: string | null }[];
};

/* ===== Lightbox 大图查看器 ===== */
function Lightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  images: { url: string; filename?: string | null }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (images.length === 0) return null;
  const img = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 上一张 */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 p-2 rounded-full bg-white/10 text-white z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* 图片 */}
      <img
        src={img.url}
        alt=""
        className="max-w-[95%] max-h-[90vh] object-contain"
        loading="eager"
        decoding="async"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 下一张 */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 p-2 rounded-full bg-white/10 text-white z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* 页码指示器 */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {images.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i === currentIndex ? "#fff" : "rgba(255,255,255,0.3)",
                transform: i === currentIndex ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
      )}

      {/* 下载 */}
      <a
        href={img.url}
        download={img.filename || "image"}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-6 right-4 p-2 rounded-full bg-white/10 text-white"
      >
        <Download className="w-5 h-5" />
      </a>
    </div>
  );
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const eventId = Number(id);

  const eventQuery = trpc.event.getById.useQuery({ id: eventId });
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"confirmed" | "pending">("pending");
  const [editTagInput, setEditTagInput] = useState("");

  // Lightbox 状态
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const event = eventQuery.data as EventDetail | undefined;
  const reviewQuery = trpc.review.getByEventId.useQuery({ eventId });
  const review = reviewQuery.data;

  // 获取所有图片（coverImage + photos + review photos）
  const allImages = (() => {
    if (!event) return [];
    const images: { url: string; filename?: string | null }[] = [];
    if (event.coverImage) images.push({ url: event.coverImage, filename: "cover" });
    event.photos?.forEach((p) => images.push({ url: p.url, filename: p.filename }));
    review?.photos?.forEach((p: any) => images.push({ url: p.url, filename: p.filename }));
    // 去重
    return images.filter((img, i, arr) => arr.findIndex((a) => a.url === img.url) === i);
  })();

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const startEditing = useCallback(() => {
    const evt = eventQuery.data;
    if (!evt) return;
    setEditTitle(evt.title);
    setEditDate(evt.date);
    setEditStartTime(evt.startTime ?? "");
    setEditEndTime(evt.endTime ?? "");
    setEditLocation(evt.location ?? "");
    setEditDescription(evt.description ?? "");
    setEditStatus(evt.status as "confirmed" | "pending");
    setEditTagInput((evt.tags ?? []).join(" "));
    setIsEditing(true);
  }, [eventQuery.data]);

  const updateMutation = trpc.event.update.useMutation({
    onSuccess: () => {
      utils.event.getById.invalidate({ id: eventId });
      utils.event.list.invalidate();
      setIsEditing(false);
      toast.success("活动更新成功");
    },
  });

  const deleteMutation = trpc.event.delete.useMutation({
    onSuccess: () => {
      utils.event.list.invalidate();
      toast.success("活动已删除");
      navigate("/events");
    },
  });

  const handleSave = () => {
    // 解析标签
    const tags = editTagInput
      .split(/[\s,，]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    updateMutation.mutate({
      id: eventId,
      title: editTitle,
      date: editDate,
      startTime: editStartTime || undefined,
      endTime: editEndTime || undefined,
      location: editLocation || undefined,
      description: editDescription || undefined,
      tags: tags.length > 0 ? tags : undefined,
      status: editStatus,
    });
  };

  // 小红书风格复制
  const handleCopyInfo = () => {
    const evt = eventQuery.data;
    if (!evt) return;

    // 仅活动标题 + 介绍 + 标签（小红书风格）
    const lines: string[] = [];

    if (evt.title) lines.push(evt.title);
    if (evt.description) lines.push("\n" + evt.description);
    if (evt.tags && evt.tags.length > 0) {
      lines.push("\n" + evt.tags.map((t: string) => "#" + t).join(" "));
    }

    const text = lines.join("").trim();
    if (!text) {
      toast.info("没有内容可复制");
      return;
    }

    navigator.clipboard.writeText(text).then(() => toast.success("已复制，可直接粘贴到小红书"));
  };

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse space-y-3 w-64">
          <div className="h-80 bg-gray-100 rounded-2xl" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <p className="text-gray-400">活动不存在</p>
        <button onClick={() => navigate("/events")} className="mt-2 text-red-500 text-sm">返回列表</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-50 px-4 h-12 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={handleCopyInfo} className="p-2 text-gray-400 hover:text-gray-600" title="复制活动文案">
            <Copy className="w-4 h-4" />
          </button>
          {isAdmin && (
            <>
              {!isEditing ? (
                <button onClick={startEditing} className="p-2 text-gray-400 hover:text-gray-600" title="编辑">
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSave} className="p-2 text-red-500" title="保存">
                  <Check className="w-4 h-4" />
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => { if (confirm("确定删除此活动吗？")) deleteMutation.mutate({ id: eventId }); }}
                  className="p-2 text-gray-400 hover:text-red-500"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* ===== 大图轮播区 ===== */}
        {allImages.length > 0 ? (
          <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
            <img
              src={allImages[0].url}
              alt={event.title}
              className="w-full h-full object-cover cursor-pointer"
              loading="lazy"
              decoding="async"
              onClick={() => openLightbox(0)}
            />
            {/* 状态标签 */}
            <div className="absolute top-3 right-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${event.status === "confirmed" ? "bg-red-500" : "bg-yellow-400 text-gray-700"}`}>
                {event.status === "confirmed" ? "已确定" : "待定"}
              </span>
            </div>
            {/* 图片数量指示 */}
            {allImages.length > 1 && (
              <div className="absolute bottom-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-white font-medium">
                1 / {allImages.length}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex items-center justify-center bg-gray-50" style={{ aspectRatio: "3/4" }}>
            <CalendarDays className="w-16 h-16 text-gray-200" />
          </div>
        )}

        {/* ===== 缩略图横向滚动 ===== */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 snap-x snap-mandatory scrollbar-hide">
            {allImages.map((img, i) => (
              <div
                key={`${img.url}-${i}`}
                className="shrink-0 snap-start cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-red-300 transition-colors"
                style={{ width: 80, height: 80 }}
                onClick={() => openLightbox(i)}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* ===== 内容区 ===== */}
        <div className="px-4 py-4">
          {isEditing ? (
            /* ===== 编辑模式 ===== */
            <div className="space-y-4">
              {/* 标题 */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">活动标题</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-lg font-bold px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 outline-none text-gray-900"
                />
              </div>

              {/* 状态 */}
              <div className="flex gap-2">
                {(["pending", "confirmed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className="px-5 h-8 rounded-full text-xs border transition-colors"
                    style={{
                      backgroundColor: editStatus === s ? (s === "confirmed" ? "#FF2442" : "#fff") : "#fff",
                      color: editStatus === s ? (s === "confirmed" ? "#fff" : "#999") : "#999",
                      borderColor: editStatus === s ? (s === "confirmed" ? "#FF2442" : "#e5e5e5") : "#e5e5e5",
                    }}
                  >
                    {s === "confirmed" ? "已确定" : "待定"}
                  </button>
                ))}
              </div>

              {/* 日期+地点 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">日期</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">地点</label>
                  <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none" placeholder="地点" />
                </div>
              </div>

              {/* 时间 */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">时间</label>
                <div className="flex gap-2 items-center">
                  <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className="flex-1 h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none" />
                  <span className="text-gray-300 text-sm">-</span>
                  <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className="flex-1 h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none" />
                </div>
              </div>

              {/* 介绍 */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">活动介绍（可直接粘贴小红书文案）</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none resize-none text-gray-900" placeholder="输入活动介绍..." />
              </div>

              {/* 标签 - 文本输入一键解析 */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">标签（用空格或逗号分隔）</label>
                <input
                  type="text"
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-sm border border-gray-100 bg-gray-50 outline-none text-gray-900"
                  placeholder="桌游 社交 派对 阿瓦隆"
                />
                {/* 实时预览 */}
                {editTagInput.trim() && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTagInput
                      .split(/[\s,，]+/)
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0)
                      .map((tag) => (
                        <span key={tag} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-500">#{tag}</span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===== 查看模式 - 小红书风格 ===== */
            <>
              {/* 标题 */}
              <h1 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                {event.title}
              </h1>

              {/* 时间地点 */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {event.date}
                  {event.startTime && ` ${event.startTime.slice(0, 5)}`}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.location}
                  </span>
                )}
              </div>

              {/* 正文 */}
              {event.description && (
                <div className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                  {event.description}
                </div>
              )}

              {/* 标签 */}
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.tags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ===== 活动照片上传区 ===== */}
        <EventPhotosSection eventId={eventId} isAdmin={isAdmin} photos={event.photos ?? []} onOpenLightbox={(idx) => openLightbox(idx + (event.coverImage ? 1 : 0))} />

        {/* ===== 活动回顾 ===== */}
        <div className="px-4 mt-6">
          <ReviewSection
            eventId={eventId}
            isAdmin={isAdmin}
            review={review}
            onPhotoClick={(url) => {
              const idx = allImages.findIndex((img) => img.url === url);
              if (idx >= 0) openLightbox(idx);
            }}
          />
        </div>
      </div>

      {/* Lightbox 大图查看器 */}
      {lightboxOpen && (
        <Lightbox
          images={allImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => setLightboxIndex((i) => (i - 1 + allImages.length) % allImages.length)}
          onNext={() => setLightboxIndex((i) => (i + 1) % allImages.length)}
        />
      )}
    </div>
  );
}

/* ===== 活动照片上传区 ===== */
function EventPhotosSection({
  eventId,
  isAdmin,
  photos,
  onOpenLightbox,
}: {
  eventId: number;
  isAdmin: boolean;
  photos: { id: number; url: string; filename: string | null }[];
  onOpenLightbox: (index: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const { compressFiles } = useImageCompress();

  const uploadMutation = trpc.photo.upload.useMutation({
    onSuccess: () => { utils.event.getById.invalidate({ id: eventId }); toast.success("照片上传成功"); },
  });
  const deleteMutation = trpc.photo.delete.useMutation({
    onSuccess: () => { utils.event.getById.invalidate({ id: eventId }); toast.success("照片已删除"); },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    toast.loading("正在压缩图片...", { id: "compress" });
    const fileList = await compressFiles(files);
    toast.dismiss("compress");
    if (fileList.length > 0) {
      uploadMutation.mutate({ eventId, files: fileList });
    }
    e.target.value = "";
  };

  if (photos.length === 0 && !isAdmin) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Image className="w-4 h-4 text-gray-400" />
          活动照片
        </h2>
        {isAdmin && (
          <button onClick={() => fileInputRef.current?.click()} className="text-xs text-red-500 hover:text-red-600 font-medium">
            + 上传照片
          </button>
        )}
        <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="group relative rounded-xl overflow-hidden shrink-0 snap-start cursor-pointer"
              style={{ width: 120, height: 120 }}
              onClick={() => onOpenLightbox(i)}
            >
              <img src={photo.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
              {isAdmin && (
                <button
                  type="button"
                  className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white shadow-md hover:bg-red-600"
                  aria-label="删除照片"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("确定删除这张照片？")) deleteMutation.mutate({ id: photo.id });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-all group-hover:bg-black/20" />
              <a
                href={photo.url}
                download={photo.filename || "photo"}
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto absolute bottom-1.5 left-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 shadow-md transition-opacity hover:bg-black/60 group-hover:opacity-100"
                aria-label="下载"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        isAdmin && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mx-4 border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center cursor-pointer hover:border-red-300 transition-colors"
          >
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto mb-1 text-gray-300" />
              <p className="text-xs text-gray-300">点击上传活动照片</p>
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* ===== 活动回顾区 ===== */
function ReviewSection({ eventId, isAdmin, review, onPhotoClick }: { eventId: number; isAdmin: boolean; review?: any; onPhotoClick?: (url: string) => void }) {
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [attendance, setAttendance] = useState("");
  const [atmosphere, setAtmosphere] = useState("");
  const [improvements, setImprovements] = useState("");
  const [summary, setSummary] = useState("");

  const deleteReviewPhotoMutation = trpc.review.deletePhoto.useMutation({
    onSuccess: () => {
      utils.review.getByEventId.invalidate({ eventId });
      toast.success("照片已删除");
    },
  });

  const upsertMutation = trpc.review.upsert.useMutation({
    onSuccess: () => { utils.review.getByEventId.invalidate({ eventId }); setIsEditing(false); toast.success("回顾保存成功"); },
  });

  const startEdit = useCallback(() => {
    setAttendance(review?.attendance?.toString() ?? "");
    setAtmosphere(review?.atmosphere ?? "");
    setImprovements(review?.improvements ?? "");
    setSummary(review?.summary ?? "");
    setIsEditing(true);
  }, [review]);

  const handleSave = () => {
    upsertMutation.mutate({
      eventId,
      attendance: attendance ? Number(attendance) : undefined,
      atmosphere: atmosphere || undefined,
      improvements: improvements || undefined,
      summary: summary || undefined,
    });
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          活动回顾
        </h2>
        {isAdmin && !isEditing && (
          <button onClick={startEdit} className="text-xs text-red-500 hover:text-red-600 font-medium">
            {review ? "编辑" : "添加"}
          </button>
        )}
        {isAdmin && isEditing && (
          <button onClick={handleSave} className="text-xs text-red-500 font-medium">保存</button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">参与人数</label>
              <input type="number" value={attendance} onChange={(e) => setAttendance(e.target.value)} className="w-full h-9 px-3 rounded-xl text-sm border border-gray-100 bg-white outline-none" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">现场氛围</label>
              <input type="text" value={atmosphere} onChange={(e) => setAtmosphere(e.target.value)} className="w-full h-9 px-3 rounded-xl text-sm border border-gray-100 bg-white outline-none" placeholder="如：热烈" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">总结</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl text-sm border border-gray-100 bg-white outline-none resize-none" placeholder="活动整体总结..." />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">需要改进的地方</label>
            <textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl text-sm border border-gray-100 bg-white outline-none resize-none" placeholder="记录需要改进的地方..." />
          </div>
          <ReviewPhotosUpload reviewId={review?.id} eventId={eventId} isAdmin={isAdmin} />
          {isAdmin && review?.photos && review.photos.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-gray-400">已上传照片</p>
              <div className="flex flex-wrap gap-2">
                {review.photos.map((photo: any) => (
                  <div key={photo.id} className="relative shrink-0 overflow-hidden rounded-xl" style={{ width: 88, height: 88 }}>
                    <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white shadow-md hover:bg-red-600"
                      aria-label="删除照片"
                      onClick={() => {
                        if (confirm("确定删除这张照片？")) {
                          deleteReviewPhotoMutation.mutate({ id: photo.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : review ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {review.attendance != null && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{review.attendance}人参与</span>}
            {review.atmosphere && <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />{review.atmosphere}</span>}
          </div>
          {review.summary && <p className="text-sm text-gray-700 leading-relaxed">{review.summary}</p>}
          {review.improvements && (
            <div className="bg-yellow-50 rounded-xl p-3">
              <p className="text-xs text-yellow-600 font-medium mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" />待改进</p>
              <p className="text-sm text-yellow-700">{review.improvements}</p>
            </div>
          )}
          {review.photos && review.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {review.photos.map((photo: any) => (
                <div
                  key={photo.id}
                  className="group relative shrink-0 cursor-pointer overflow-hidden rounded-xl"
                  style={{ width: 100, height: 100 }}
                  onClick={() => onPhotoClick?.(photo.url)}
                >
                  <img src={photo.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
                  {isAdmin && (
                    <button
                      type="button"
                      className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white shadow-md hover:bg-red-600"
                      aria-label="删除回顾照片"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("确定删除这张照片？")) {
                          deleteReviewPhotoMutation.mutate({ id: photo.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                    <a
                      href={photo.url}
                      download={photo.filename || "review-photo"}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-full bg-white/20 p-1.5"
                    >
                      <Download className="h-3.5 w-3.5 text-white" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-300">暂无回顾记录</p>
      )}
    </div>
  );
}

/* ===== 回顾照片上传 ===== */
function ReviewPhotosUpload({ reviewId, eventId, isAdmin }: { reviewId?: number; eventId: number; isAdmin: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const { compressFiles } = useImageCompress();

  const uploadMutation = trpc.review.uploadPhoto.useMutation({
    onSuccess: () => { utils.review.getByEventId.invalidate({ eventId }); toast.success("上传成功"); },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!reviewId) { toast.error("请先保存回顾信息"); return; }
    const files = e.target.files;
    if (!files?.length) return;
    toast.loading("正在压缩图片...", { id: "compress-review" });
    const fileList = await compressFiles(files);
    toast.dismiss("compress-review");
    if (fileList.length > 0) {
      uploadMutation.mutate({ reviewId, files: fileList });
    }
    e.target.value = "";
  };

  if (!isAdmin) return null;

  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Camera className="w-3 h-3" /> 回顾照片</label>
      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center cursor-pointer hover:border-red-300 transition-colors">
        <div className="text-center">
          <Upload className="w-5 h-5 mx-auto mb-1 text-gray-300" />
          <p className="text-xs text-gray-300">点击上传</p>
        </div>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
