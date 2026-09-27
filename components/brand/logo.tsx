import Image from 'next/image';
import Link from 'next/link';

export function Logo({
  compact = false,
  markOnly = false,
  href = '/dashboard',
  inverse = false,
}: {
  compact?: boolean;
  markOnly?: boolean;
  href?: string;
  inverse?: boolean;
}) {
  const width = markOnly ? 42 : compact ? 142 : 188;
  const height = markOnly ? 42 : compact ? 42 : 56;

  return (
    <Link href={href} aria-label="MYRQO" className="group inline-flex items-center px-1">
      <Image src={markOnly ? "/brand/myrqo-mark-new.png" : inverse ? "/brand/myrqo-logo-balanced-dark.png" : "/brand/myrqo-logo-balanced-light.png"} alt="MYRQO" width={width} height={height} priority className="h-auto scale-y-[1.08] object-contain transition-transform duration-200 group-hover:scale-[1.04]" />
    </Link>
  );
}
