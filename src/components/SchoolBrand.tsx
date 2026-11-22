export const SCHOOL_NAME = "Pangangan Elementary School";
export const SCHOOL_ADDRESS = "Lomboy, Calape, Bohol";

export function SchoolBrand({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/pangangan_es_library_hub_logo.svg"
        alt="Pangangan ES Library Hub logo"
        width={compact ? 44 : 54}
        height={compact ? 44 : 54}
        className={`rounded-full bg-white object-contain shadow-sm p-0.5 ${compact ? "h-11 w-11" : "h-[54px] w-[54px]"}`}
      />
      <div className="leading-tight">
        <p className={`font-display font-semibold ${compact ? "text-base" : "text-lg"} ${inverse ? "text-white" : "text-ink-900"}`}>
          {SCHOOL_NAME}
        </p>
        <p className={`text-sm ${inverse ? "text-ink-100" : "text-ink-700"}`}>Library Hub · {SCHOOL_ADDRESS}</p>
      </div>
    </div>
  );
}
