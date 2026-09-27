const serviceLogos: Array<{ match: RegExp; logo: string; color: string }> = [
  { match: /spotify/i, logo: "/service-logos/spotify.svg", color: "#1DB954" },
  { match: /netflix/i, logo: "/service-logos/netflix.svg", color: "#E50914" },
  { match: /figma/i, logo: "/service-logos/figma.svg", color: "#F24E1E" },
  { match: /notion/i, logo: "/service-logos/notion.svg", color: "#111827" },
  { match: /github/i, logo: "/service-logos/github.svg", color: "#181717" },
  { match: /icloud/i, logo: "/service-logos/icloud.svg", color: "#3693F3" },
  { match: /youtube/i, logo: "/service-logos/youtube.svg", color: "#FF0000" },
  { match: /1password/i, logo: "/service-logos/1password.svg", color: "#0094F5" },
  { match: /linear/i, logo: "/service-logos/linear.svg", color: "#5E6AD2" },
  { match: /loom/i, logo: "/service-logos/loom.svg", color: "#625DF5" },
  { match: /vercel/i, logo: "/service-logos/vercel.svg", color: "#111827" },
  { match: /framer/i, logo: "/service-logos/framer.svg", color: "#0055FF" },
];

const fallbackColors = ["#2563EB", "#06B6D4", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981"];

export function serviceVisual(name: string) {
  const known = serviceLogos.find((service) => service.match.test(name));
  if (known) return known;
  const index = (name.charCodeAt(0) || 0) % fallbackColors.length;
  return { logo: null, color: fallbackColors[index] };
}
