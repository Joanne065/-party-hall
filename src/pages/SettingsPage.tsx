import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Lock, Eye, EyeOff, Shield, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SettingsPage() {
  const { isAdmin } = useAuth();

  const [adminPassword, setAdminPassword] = useState("");
  const [visitorPassword, setVisitorPassword] = useState("");
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [showVisitorPwd, setShowVisitorPwd] = useState(false);

  const updateMutation = trpc.password.update.useMutation({
    onSuccess: () => {
      toast.success("密码更新成功");
      setAdminPassword("");
      setVisitorPassword("");
    },
    onError: (err) => {
      toast.error(err.message || "更新失败");
    },
  });

  const handleUpdate = () => {
    const data: Record<string, string> = {};
    if (adminPassword) data.adminPassword = adminPassword;
    if (visitorPassword) data.visitorPassword = visitorPassword;
    if (Object.keys(data).length === 0) {
      toast.info("请输入新密码");
      return;
    }
    updateMutation.mutate(data);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 bg-white min-h-screen">
      <h1 className="text-xl font-bold text-gray-900 mb-6">设置</h1>

      {/* Password Section */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">访问密码</h2>
            <p className="text-xs text-gray-400">修改管理员和访客的访问密码</p>
          </div>
        </div>

        {!isAdmin ? (
          <div className="text-center py-6">
            <Shield className="w-8 h-8 mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">仅管理员可修改密码</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                管理员密码
              </label>
              <div className="relative">
                <input
                  type={showAdminPwd ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 rounded-xl text-sm border border-gray-100 bg-white outline-none"
                  placeholder="输入新管理员密码..."
                />
                <button type="button" onClick={() => setShowAdminPwd(!showAdminPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showAdminPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] mt-1 text-gray-300">留空表示不修改</p>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                访客密码
              </label>
              <div className="relative">
                <input
                  type={showVisitorPwd ? "text" : "password"}
                  value={visitorPassword}
                  onChange={(e) => setVisitorPassword(e.target.value)}
                  className="w-full h-10 px-3 pr-10 rounded-xl text-sm border border-gray-100 bg-white outline-none"
                  placeholder="输入新访客密码..."
                />
                <button type="button" onClick={() => setShowVisitorPwd(!showVisitorPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showVisitorPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] mt-1 text-gray-300">留空表示不修改</p>
            </div>

            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="w-full h-10 text-sm font-medium rounded-full border-0 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "更新中..." : "保存密码"}
            </Button>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">关于</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs text-gray-400">版本</span>
            <span className="text-xs text-gray-700">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-gray-400">派对大厅</span>
            <span className="text-xs text-gray-700">活动管理平台</span>
          </div>
        </div>
      </div>
    </div>
  );
}
