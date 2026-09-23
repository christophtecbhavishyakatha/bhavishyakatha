export interface AstrologyPosition {
  longitude: number;
  sign: { id: number; name: string; lord: string };
  degree: number;
  minutes: number;
  seconds: number;
  retrograde: boolean;
}
export interface AstrologyNakshatra { number:number; name:string; pada:number; lord:string; }
export interface AstrologyPlanet {
  name:string; position:AstrologyPosition; house:number; nakshatra:AstrologyNakshatra;
}
export interface D1Chart {
  ascendant:{position:AstrologyPosition; house:number; nakshatra:AstrologyNakshatra};
  planets:Record<string,AstrologyPlanet>; referenceSign:string; julianDayUt:number; utcDatetime:string;
}
export interface D9Placement { longitude:number; sign:string; house:number; }
export interface D9Chart { referenceSign:string; placements:Record<string,D9Placement>; }
export interface DerivedMoonChart {
  referenceSign:string; referenceSignId:number;
  planets:Record<string,{name:string;longitude:number;sign:string;signId:number;house:number}>;
}
export interface AstrologyModel {
  charts:{d1?:D1Chart;d9?:D9Chart;moon?:DerivedMoonChart};
  dashas?:{vimshottari?:unknown}; panchang?:unknown;
}
