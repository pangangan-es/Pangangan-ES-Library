import { SchoolBrand } from "@/components/SchoolBrand";

export function ConfigError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <SchoolBrand />
      <div role="alert" className="mt-8 rounded-lg border border-danger-600 bg-danger-50 p-5 text-danger-700">
        <h1 className="font-display text-xl font-semibold">The library site is not configured</h1>
        <p className="mt-2">{message}</p>
        <p className="mt-2 text-sm">
          The site owner needs to set the public Supabase settings for this deployment. See the deployment guide in the project documentation.
        </p>
      </div>
    </div>
  );
}
