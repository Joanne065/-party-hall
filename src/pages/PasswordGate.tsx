import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordGate() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const verifyMutation = trpc.password.verify.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token && data.role) {
        localStorage.setItem("eventhub_token", data.token);
        window.location.reload();
      } else {
        setError("密码错误，请重试");
      }
    },
    onError: () => {
      setError("验证失败，请重试");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError("");
    verifyMutation.mutate({ password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-gray-900">
            派对大厅
          </h1>
          <p className="text-sm text-gray-400">
            输入密码，发现精彩活动
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码..."
              className="h-12 pr-12 bg-gray-50 border-0 text-base text-gray-900 placeholder:text-gray-300 rounded-xl focus-visible:ring-red-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-center text-red-500">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={verifyMutation.isPending || !password.trim()}
            className="w-full h-12 text-base font-medium rounded-full border-0 bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            {verifyMutation.isPending ? "验证中..." : "进入"}
          </Button>
        </form>

        <p className="text-xs text-center mt-8 text-gray-300">
          管理员密码: admin123 &nbsp;|&nbsp; 访客密码: guest
        </p>
      </div>
    </div>
  );
}
