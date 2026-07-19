import Image from 'next/image';
import Link from 'next/link';

export function Logo({
  compact = false,
  href = '/dashboard',
  inverse = false,
}: {
  compact?: boolean;
  href?: string;
  inverse?: boolean;
}) {
  const width = compact ? 120 : 160;
  const height = compact ? 36 : 48;

  return (
    <Link href={href} aria-label="Mirqo" className="group inline-flex items-center">
      {inverse ? (
        <Image src="/brand/mirqo-horizontal-dark.png" alt="Mirqo" width={width} height={height} priority className="h-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]" />
      ) : (
        <>
          <Image src="/brand/mirqo-horizontal.png" alt="Mirqo" width={width} height={height} priority className="h-auto object-contain transition-transform duration-200 group-hover:scale-[1.02] dark:hidden" />
          <Image src="/brand/mirqo-horizontal-dark.png" alt="Mirqo" width={width} height={height} priority className="hidden h-auto object-contain transition-transform duration-200 group-hover:scale-[1.02] dark:block" />
        </>
      )}
    </Link>
  );
}