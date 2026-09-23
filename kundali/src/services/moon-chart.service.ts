import type { D1Chart, DerivedMoonChart } from "../models/astrology-model.js";

export function deriveMoonChart(d1:D1Chart):DerivedMoonChart {
  const moon=d1.planets.Moon;
  if(!moon) throw new Error("Moon position is required to derive Moon chart.");
  const moonSignId=moon.position.sign.id;
  const planets:DerivedMoonChart["planets"]={};
  for(const [key,planet] of Object.entries(d1.planets)){
    const signId=Math.floor((((planet.position.longitude%360)+360)%360)/30)+1;
    const house=((signId-moonSignId+12)%12)+1;
    planets[key]={name:planet.name,longitude:planet.position.longitude,sign:planet.position.sign.name,signId,house};
  }
  return {referenceSign:moon.position.sign.name,referenceSignId:moonSignId,planets};
}
