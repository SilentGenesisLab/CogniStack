import { Card } from "@/components/ui/Card";

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">社区对练</h1>

      <Card>
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-text-secondary">社区功能即将上线</p>
          <p className="mt-1 text-sm text-text-muted">
            与其他学习者进行知识对练和讨论
          </p>
        </div>
      </Card>
    </div>
  );
}
