import {
  Car,
  CreditCard,
  Droplet,
  Dumbbell,
  Flower2,
  Globe,
  HandCoins,
  HardDrive,
  HeartPulse,
  Home,
  KeySquare,
  Layers,
  MoreHorizontal,
  Receipt,
  Shield,
  Smartphone,
  Trophy,
  Waves,
  Wifi,
  Zap,
} from 'lucide-react';
import type { CommitmentType } from '@/types/database';

export const COMMITMENT_TYPE_ICONS: Record<CommitmentType, typeof CreditCard> = {
  subscription: CreditCard,
  bnpl: Layers,
  membership: Dumbbell,
  insurance: Shield,
  bill: Receipt,
  debt: HandCoins,
  other: MoreHorizontal,
};

// Positional — must line up with each type's list in commitmentTypePresets (en.ts / ar.ts).
export const COMMITMENT_TYPE_PRESET_ICONS: Record<CommitmentType, (typeof CreditCard)[]> = {
  subscription: [],
  bnpl: [Layers, Layers, Layers, Layers],
  membership: [Dumbbell, Flower2, Trophy, Waves],
  insurance: [Car, HeartPulse, Home, Shield],
  bill: [Zap, Droplet, Wifi, Home, Smartphone],
  debt: [],
  other: [Globe, KeySquare, HardDrive],
};

export function suggestCommitmentType(name: string): CommitmentType {
  const value = name.toLowerCase();
  if (/tabby|tamara|postpay|klarna|afterpay|installment|قسط|تقسيط/.test(value)) return 'bnpl';
  if (/gym|fitness|club|yoga|crossfit|جيم|نادي|لياقة/.test(value)) return 'membership';
  if (/insurance|policy|takaful|تأمين/.test(value)) return 'insurance';
  if (/electricity|water bill|internet|wifi|wi-fi|rent|utility|utilities|كهرباء|ماء|فاتورة|إنترنت|انترنت|واي فاي|إيجار/.test(value)) return 'bill';
  return 'subscription';
}
