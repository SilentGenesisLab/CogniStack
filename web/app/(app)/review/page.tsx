import { Card } from "@/components/ui/Card";

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">闪卡复盘</h1>

      <Card>
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-text-secondary">暂无待复习的卡片</p>
          <p className="mt-1 text-sm text-text-muted">
            通过「知识消化」生成闪卡后，系统会基于 FSRS 算法安排复习
          </p>
        </div>
      </Card>
    </div>
  );
}
