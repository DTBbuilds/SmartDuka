import { DataLoading } from '@/components/ui/loading';

export default function ReportsLoading() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 rounded bg-muted animate-shimmer" />
        <div className="h-4 w-64 rounded bg-muted animate-shimmer" />
      </div>
      <DataLoading type="cards" rows={4} />
      <div className="mt-6">
        <DataLoading type="table" rows={6} />
      </div>
    </div>
  );
}
