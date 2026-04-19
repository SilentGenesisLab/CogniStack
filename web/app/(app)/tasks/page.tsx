import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">任务清单</h1>
        <Button>新建任务</Button>
      </div>

      {/* Eisenhower Matrix */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-sm font-medium text-red-600">
            紧急且重要
          </h3>
          <p className="text-sm text-text-muted">暂无任务</p>
        </Card>
        <Card>
          <h3 className="mb-2 text-sm font-medium text-primary">
            重要不紧急
          </h3>
          <p className="text-sm text-text-muted">暂无任务</p>
        </Card>
        <Card>
          <h3 className="mb-2 text-sm font-medium text-yellow-600">
            紧急不重要
          </h3>
          <p className="text-sm text-text-muted">暂无任务</p>
        </Card>
        <Card>
          <h3 className="mb-2 text-sm font-medium text-text-muted">
            不紧急不重要
          </h3>
          <p className="text-sm text-text-muted">暂无任务</p>
        </Card>
      </div>
    </div>
  );
}
