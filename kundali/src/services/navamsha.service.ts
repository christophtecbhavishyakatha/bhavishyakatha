import {env} from "../config/env.js";import {AppError,isRetryableStatus} from "../utils/errors.js";import {withRetry} from "../utils/retry.js";import type {ProviderPayload} from "../types/kundali.js";
async function post(ep:string,p:ProviderPayload){return withRetry(async()=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),env.NAVAMSHA_TIMEOUT_MS);try{const r=await fetch(`${env.NAVAMSHA_BASE_URL}${ep}`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":env.NAVAMSHA_API_KEY,Accept:"application/json"},body:JSON.stringify(p),signal:c.signal});const text=await r.text();if(!r.ok)throw new AppError(r.status>=500?502:400,"Astrology provider returned an error.","NAVAMSHA_PROVIDER_ERROR",{providerStatus:r.status,response:text.slice(0,1000)});try{return JSON.parse(text)}catch{throw new AppError(502,"Astrology provider returned invalid JSON.","NAVAMSHA_INVALID_RESPONSE")}}catch(e){if(e instanceof AppError)throw e;throw new AppError(502,"Unable to reach the astrology provider.","NAVAMSHA_NETWORK_ERROR")}finally{clearTimeout(t)}},env.NAVAMSHA_MAX_RETRIES,e=>e instanceof AppError&&["NAVAMSHA_NETWORK_ERROR","NAVAMSHA_PROVIDER_ERROR"].includes(e.code))}
export const getD1=(p:ProviderPayload)=>post("/api/v1/kundali/basic",p);export const getD9=(p:ProviderPayload)=>post("/api/v1/divisional/d9",p);export const getVimshottari=(p:ProviderPayload)=>post("/api/v1/dasha/vimshottari",p);
export const getPanchang = (payload:{
  year:number; month:number; date:number;
  hours:number; minutes:number; seconds:number;
  latitude:number; longitude:number; timezone:number;
  settings:ProviderPayload["settings"];
}) => post("/api/v1/astrology/panchang", payload);
