import logger from './logger';

export interface Currency {
  code: string;
  name: string;
  emoji: string;
  fictional: boolean;
  usdEquivalent?: number;
}

interface ExchangeRates {
  COP: number;
  MXN: number;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', emoji: '🇺🇸', fictional: false },
  { code: 'COP', name: 'Peso Colombiano', emoji: '🇨🇴', fictional: false },
  { code: 'MXN', name: 'Peso Mexicano', emoji: '🇲🇽', fictional: false },
  { code: 'GNS', name: 'Gansito', emoji: '🍰', fictional: true, usdEquivalent: 1 },
  { code: 'BAL', name: 'Balatro', emoji: '🃏', fictional: true, usdEquivalent: 10 },
  { code: 'SLK', name: 'Silksong', emoji: '🕷️', fictional: true, usdEquivalent: 20 },
  { code: 'SPX', name: 'Sub Proxy', emoji: '🔌', fictional: true, usdEquivalent: 3.9 },
  { code: 'AKC', name: 'AK-cartel', emoji: '🐉', fictional: true, usdEquivalent: 19.4 },
];

let cachedRates: ExchangeRates | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000;

export async function fetchRates(): Promise<ExchangeRates> {
  const now = Date.now();
  if (cachedRates && now - cacheTimestamp < CACHE_TTL) return cachedRates;

  const key = process.env.EXCHANGE_RATE_API_KEY;
  const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`);

  if (!res.ok) {
    if (cachedRates) {
      logger.warn({ status: res.status }, 'ExchangeRate-API falló, reutilizando cache expirado');
      return cachedRates;
    }
    throw new Error(`ExchangeRate-API error: ${res.status}`);
  }

  const json = (await res.json()) as { conversion_rates: Record<string, number> };
  cachedRates = {
    COP: json.conversion_rates['COP'],
    MXN: json.conversion_rates['MXN'],
  };
  cacheTimestamp = now;
  return cachedRates;
}

export function toUSD(amount: number, code: string, rates: ExchangeRates): number {
  const currency = CURRENCIES.find((c) => c.code === code)!;
  if (currency.fictional) return amount * currency.usdEquivalent!;
  if (code === 'USD') return amount;
  return amount / rates[code as keyof ExchangeRates];
}

export function fromUSD(amountUSD: number, code: string, rates: ExchangeRates): number {
  const currency = CURRENCIES.find((c) => c.code === code)!;
  if (currency.fictional) return amountUSD / currency.usdEquivalent!;
  if (code === 'USD') return amountUSD;
  return amountUSD * rates[code as keyof ExchangeRates];
}
