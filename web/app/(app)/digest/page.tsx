import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DigestPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">知识消化</h1>
        <Button>导入内容</Button>
      </div>

      <Card>
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-text-secondary">
            还没有导入任何内容
          </p>
          <p className="mt-1 text-sm text-text-muted">
            支持粘贴文章链接、上传 PDF 或直接输入文本
          </p>
        </div>
      </Card>
    </div>
  );
}
