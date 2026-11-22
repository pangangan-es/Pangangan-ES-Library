import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-2 text-ink-700">That address does not exist in the library site.</p>
      <Link to="/catalog" className="mt-4 inline-flex min-h-[44px] items-center font-semibold text-teal-700 underline">
        Go to the catalog
      </Link>
    </div>
  );
}
