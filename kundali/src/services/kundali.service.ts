import crypto from "node:crypto";import {env} from "../config/env.js";import {MemoryCache} from "../utils/cache.js";import {getD1,getD9,getVimshottari,getPanchang} from "./navamsha.service.js";import {resolvePlace} from "./geocoding.service.js";import type {ValidatedKundaliRequest} from "../validators/kundali.js";import type {KundaliResponse,ProviderPayload,ResolvedPlace} from "../types/kundali.js";
import {kundaliResponseSchema} from "../validators/response.js";
import {astrologyProviderError} from "./provider-errors.js";
import {deriveMoonChart} from "./moon-chart.service.js";
import {renderD1,renderD9,renderMoon} from "./chart-renderer.service.js";
import {AppError} from "../utils/errors.js";
const cache=new MemoryCache<KundaliResponse>(3600000);const unwrap=(x:any)=>x?.output??x;
function payload(p:ResolvedPlace,date:string,time:string):ProviderPayload{const [y,m,d]=date.split("-").map(Number),q=time.split(":").map(Number);return{year:y!,month:m!,date:d!,hours:q[0]!,minutes:q[1]!,seconds:q[2]??0,latitude:p.latitude,longitude:p.longitude,timezone:p.utcOffsetMinutes/60,settings:{observation_point:env.NAVAMSHA_OBSERVATION_POINT,ayanamsha:env.NAVAMSHA_AYANAMSHA,language:"en"}}}
const pos=(x:any)=>({longitude:Number(x.fullDegree??x.longitude??0),sign:{id:Number(x.current_sign??0),name:String(x.zodiac_sign_name??x.sign??""),lord:String(x.zodiac_sign_lord??"")},degree:Number(x.degrees??0),minutes:Number(x.minutes??0),seconds:Number(x.seconds??0),retrograde:String(x.isRetro)==="true"||x.isRetro===true});
const nak=(x:any)=>({number:Number(x.nakshatra_number??0),name:String(x.nakshatra_name??""),pada:Number(x.nakshatra_pada??0),lord:String(x.nakshatra_vimsottari_lord??"")});
function d1(x:any){const planets:any={};for(const [n,v] of Object.entries(x.planets??{}))planets[n]={name:n,position:pos(v),house:Number((v as any).house_number??0),nakshatra:nak(v)};return{ascendant:{position:pos(x.ascendant),house:Number(x.ascendant?.house_number??1),nakshatra:nak(x.ascendant)},planets,referenceSign:String(x.reference_sign??""),julianDayUt:Number(x.julian_day_ut??0),utcDatetime:String(x.utc_datetime??"")}}
function d9(x:any){const placements:any={};for(const [n,v] of Object.entries(x.placements??{}))placements[n]={longitude:Number((v as any).longitude??0),sign:String((v as any).sign??""),house:Number((v as any).house??0)};return{referenceSign:String(x.reference_sign??""),placements}}
function panchang(x:any){
  const raw=unwrap(x);
  return {
    vaara: raw.vaara,
    nakshatra: raw.nakshatra,
    tithi: raw.tithi,
    karana: raw.karana,
    yoga: raw.yoga,
    sunrise: raw.sunrise,
    sunset: raw.sunset,
    moonrise: raw.moonrise,
    moonset: raw.moonset
  };
}
function vd(x:any){return{yearMode:String(x.year_mode??""),balance:{lord:String(x.balance?.lord??""),elapsedFraction:Number(x.balance?.elapsed_fraction??0),remainingFraction:Number(x.balance?.remaining_fraction??0),balanceYears:Number(x.balance?.balance_years??0)},mahadashas:(x.mahadashas??[]).map((v:any)=>({lord:String(v.lord??""),start:String(v.start??""),end:String(v.end??""),durationDays:Number(v.duration_days??0)}))}}
export async function generateKundali(req:ValidatedKundaliRequest):Promise<KundaliResponse>{const place=await resolvePlace(req.birth.place,req.birth.date,req.birth.time,req.birth.latitude,req.birth.longitude);const key=crypto.createHash("sha256").update(JSON.stringify({req,place,calc:[env.NAVAMSHA_AYANAMSHA,env.NAVAMSHA_OBSERVATION_POINT]})).digest("hex");const hit=cache.get(key);if(hit)return hit;const p=payload(place,req.birth.date,req.birth.time);
const charts:any={},dashas:any={};let out_panchang:any;

if(req.include.d1){
  try{
    charts.d1=d1(unwrap(await getD1(p)));
    charts.moon=deriveMoonChart(charts.d1);
  }catch(e){throw astrologyProviderError("d1",e)}
}
if(req.include.d9){
  try{charts.d9=d9(unwrap(await getD9(p)))}catch(e){throw astrologyProviderError("d9",e)}
}
if(req.include.vimshottari){
  try{dashas.vimshottari=vd(unwrap(await getVimshottari(p)))}catch(e){throw astrologyProviderError("vimshottari",e)}
}
if(req.include.charts){
  try{
    const images:any={};
    if(charts.d1) images.lagna=await renderD1(charts.d1,req.include.chartOptions);
    if(charts.d9) images.navamsa=await renderD9(charts.d9,req.include.chartOptions);
    if(charts.moon) images.moon=await renderMoon(charts.moon,req.include.chartOptions);
    charts.images=images;
  }catch(e){
    console.error("[Chart Renderer] failed:",e);
    throw new AppError(500,"Unable to render Kundali charts.","CHART_RENDER_FAILED");
  }
}
if(req.include.panchang){
  try{
    out_panchang=panchang(await getPanchang({
      year:Number(req.birth.date.slice(0,4)),
      month:Number(req.birth.date.slice(5,7)),
      date:Number(req.birth.date.slice(8,10)),
      hours:Number(req.birth.time.slice(0,2)),
      minutes:Number(req.birth.time.slice(3,5)),
      seconds:Number(req.birth.time.slice(6,8)),
      latitude:place.latitude,
      longitude:place.longitude,
      timezone:place.utcOffsetMinutes/60,
      settings:{
        observation_point:"geocentric",
        ayanamsha:"lahiri",
        language:"en"
      }
    }));
  }catch(e){throw astrologyProviderError("panchang",e)}
}

const out:any={
  schemaVersion:"1.0",
  provider:{name:"navamsha",calculation:{ayanamsha:env.NAVAMSHA_AYANAMSHA,observationPoint:env.NAVAMSHA_OBSERVATION_POINT}},
  birth:{date:req.birth.date,time:req.birth.time.length===5?`${req.birth.time}:00`:req.birth.time,place},
  charts
};
if(req.include.vimshottari)out.dashas=dashas;
if(req.include.panchang)out.panchang=out_panchang;

const validated=kundaliResponseSchema.safeParse(out);
if(!validated.success){
  console.error("[Kundali Contract] Response validation failed:",validated.error.issues);
  throw new AppError(502,"Unable to generate a valid Kundali response.","INVALID_PROVIDER_DATA");
}

cache.set(key,validated.data);
return validated.data;}