import { Card } from "@/components/ui/Card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">成长数据</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-medium text-text-primary">学习趋势</h3>
          <div className="flex h-48 items-center justify-center text-text-muted">
            暂无数据
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-medium text-text-primary">认知雷达图</h3>
          <div className="flex h-48 items-center justify-center text-text-muted">
            暂无数据
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-medium text-text-primary">复习效率</h3>
          <div className="flex h-48 items-center justify-center text-text-muted">
            暂无数据
          </div>
        </Card>
        <Card>
          <h3 className="mb-2 font-medium text-text-primary">情绪与偏差</h3>
          <div className="flex h-48 items-center justify-center text-text-muted">
            暂无数据
          </div>
        </Card>
      </div>
    </div>
  );
}
