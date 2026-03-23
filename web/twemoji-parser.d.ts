declare module 'twemoji-parser' {
  interface ParsedEmoji {
    type: string;
    text: string;
    url: string;
    indices: [number, number];
  }
  export function parse(text: string, options?: { assetType?: 'svg' | 'png' }): ParsedEmoji[];
}
