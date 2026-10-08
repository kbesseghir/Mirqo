import Image from 'next/image';
import Link from 'next/link';

export function Logo({
  compact = false,
  markOnly = false,
  href = '/dashboard',
}: {
  compact?: boolean;
  markOnly?: boolean;
  href?: string;
}) {
  const markSize = 35;
  const wordmarkWidth = compact ? 138 : 184;
  const wordmarkHeight = compact ? 45 : 60;

  return (
    <Link href={href} aria-label="Myrqo" className="group inline-flex shrink-0 items-center px-1">
      {markOnly ? (
        <Image
          src="/brand/myrqo-mark-violet.png"
          alt=""
          width={markSize}
          height={markSize}
          priority
          className="shrink-0 object-contain transition-transform duration-200 group-hover:scale-[1.04]"
        />
      ) : (
        <>
          <Image
            src="/brand/myrqo-wordmark-light.png"
            alt="Myrqo"
            width={wordmarkWidth}
            height={wordmarkHeight}
            priority
            className="h-auto shrink-0 object-contain transition-transform duration-200 group-hover:scale-[1.025] dark:hidden"
          />
          <Image
            src="/brand/myrqo-wordmark-dark.png"
            alt="Myrqo"
            width={wordmarkWidth}
            height={wordmarkHeight}
            priority
            className="hidden h-auto shrink-0 object-contain transition-transform duration-200 group-hover:scale-[1.025] dark:block"
          />
        </>
      )}
    </Link>
  );
}
