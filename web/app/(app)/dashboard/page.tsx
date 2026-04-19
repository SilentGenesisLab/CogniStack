import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">今日概览</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-text-secondary">待复习卡片</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">0</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">连续打卡</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">0 天</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">今日任务</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">0</p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">认知评分</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">--</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="mb-3 text-base font-medium text-text-primary">
          快速开始
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">导入知识</Badge>
          <Badge variant="info">开始复习</Badge>
          <Badge variant="info">认知训练</Badge>
          <Badge variant="info">记录心情</Badge>
        </div>
      </Card>
    </div>
  );
}
