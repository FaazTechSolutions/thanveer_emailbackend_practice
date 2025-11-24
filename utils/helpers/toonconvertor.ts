import { encode, decode } from '@toon-format/toon'



export function convertToToon(data: any): string {
    return encode(data)}
export function convertFromToon(toonData: string): any {
    return decode(toonData)}
