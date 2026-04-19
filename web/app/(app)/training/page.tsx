import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">认知训练</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h3 className="font-medium text-text-primary">注意力训练</h3>
          <p className="mt-1 text-sm text-text-secondary">
            提升专注力和选择性注意
          </p>
          <Button variant="secondary" size="sm" className="mt-4">
            开始训练
          </Button>
        </Card>
        <Card>
          <h3 className="font-medium text-text-primary">记忆力训练</h3>
          <p className="mt-1 text-sm text-text-secondary">
            强化工作记忆和长期记忆
          </p>
          <Button variant="secondary" size="sm" className="mt-4">
            开始训练
          </Button>
        </Card>
        <Card>
          <h3 className="font-medium text-text-primary">逻辑推理</h3>
          <p className="mt-1 text-sm text-text-secondary">
            锻炼逻辑思维和批判性思考
          </p>
          <Button variant="secondary" size="sm" className="mt-4">
            开始训练
          </Button>
        </Card>
      </div>
    </div>
  );
}
