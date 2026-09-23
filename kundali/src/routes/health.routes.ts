import {Router} from "express";const r=Router();r.get("/",(_req,res)=>res.json({status:"ok",service:"bhavishya-kundali-api",version:"1.3.5"}));export default r;
