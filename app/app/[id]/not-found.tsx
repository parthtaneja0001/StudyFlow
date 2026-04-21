import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl font-semibold text-gradient mb-3">404</div>
        <div className="text-lg text-white/80 mb-1">Course not found</div>
        <div className="text-sm text-white/50 mb-6">It may have been deleted or never existed.</div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
