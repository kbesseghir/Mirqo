import Image from "next/image";
import { serviceVisual } from "@/lib/services";

export function ServiceLogo({
  name,
  className = "h-10 w-10 rounded-xl",
}: {
  name: string;
  className?: string;
}) {
  const visual = serviceVisual(name);
  if (visual.logo) {
    return (
      <span
        className={`grid shrink-0 place-items-center border border-slate-100 bg-white shadow-sm ${className}`}
        title={name}
      >
        <Image src={visual.logo} alt="" width={28} height={28} className="h-[58%] w-[58%] object-contain" />
      </span>
    );
  }
  return (
    <span
      className={`grid shrink-0 place-items-center font-bold text-white shadow-sm ${className}`}
      style={{ backgroundColor: visual.color }}
      title={name}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
