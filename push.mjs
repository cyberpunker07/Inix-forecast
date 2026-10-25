/* INIX Forecast – push server (runs on GitHub Actions). Sends Web Push to the phones saved in PUSH_SUBSCRIPTIONS. */
import webpush from "web-push";

const PUB="BAuSy5hBKfga0ByS6qfv7BGh62PNKhlNg0JwMX65qMAcsY79NUny9c-src76dD6Rrs8cHB1vOkJNhFXoelyZ7nQ";
const PRIV=process.env.VAPID_PRIVATE_KEY;
const SITE="https://cyberpunker07.github.io/Inix-forecast/";
const TEST=process.env.FORCE_TEST==="true";
const DAILY_HOUR=7; // morning note at 7 AM local time of the saved place

if(!PRIV){console.error("VAPID_PRIVATE_KEY secret is missing");process.exit(1)}
webpush.setVapidDetails("mailto:nainarmohamed828@gmail.com",PUB,PRIV);

/* subscriptions: a JSON array, a single JSON object, or one JSON object per line */
function parseSubs(raw){raw=(raw||"").trim();if(!raw)return[];
  try{const v=JSON.parse(raw);return Array.isArray(v)?v:[v]}catch(e){}
  return raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{try{return JSON.parse(l)}catch(e){console.error("Skipping a line that is not valid JSON");return null}}).filter(Boolean)}

function wname(c,l){const n=c===0?["Clear sky","साफ़ आसमान","தெளிவான வானம்"]:c<=2?["Partly cloudy","आंशिक बादल","பகுதி மேகமூட்டம்"]:c===3?["Cloudy","बादल छाए","மேகமூட்டம்"]:c<=48?["Fog","कोहरा","பனிமூட்டம்"]:c<=57?["Drizzle","बूंदाबांदी","தூறல்"]:c<=67?["Rain","बारिश","மழை"]:c<=77?["Snow","बर्फ़बारी","பனிப்பொழிவு"]:c<=82?["Rain showers","बारिश की बौछारें","மழைச் சாரல்"]:c<=86?["Snow showers","बर्फ़ की बौछारें","பனிச் சாரல்"]:["Thunderstorm","आंधी-तूफ़ान","இடியுடன் கூடிய மழை"];return l(n[0],n[1],n[2])}
const h12=h=>((h%12)||12)+(h<12?" AM":" PM");

async function weather(p){
  const u="https://api.open-meteo.com/v1/forecast?latitude="+p.lat+"&longitude="+p.lon+"&current=temperature_2m,weather_code&hourly=precipitation_probability,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max&timezone=auto&forecast_days=3";
  const r=await fetch(u);if(!r.ok)throw new Error("Open-Meteo "+r.status);return r.json()}

/* decide which notifications this phone gets right now */
function decide(p,j){
  const l=(en,hi,ta)=>p.lang==="hi"?hi:p.lang==="ta"?ta:en,tn=c=>Math.round(p.unit==="F"?c*9/5+32:c)+"°",place=p.name||"";
  const out=[],y=j.daily,H=j.hourly,hourNow=+j.current.time.slice(11,13);
  if(TEST){const pp=y.precipitation_probability_max[0]||0,mm=y.precipitation_sum[0]||0;
    out.push({title:"🔔 "+l("Test push","टेस्ट पुश","சோதனை புஷ்")+" · "+place,body:l("Push is working. Today: ","पुश काम कर रहा है। आज: ","புஷ் செயல்படுகிறது. இன்று: ")+wname(j.current.weather_code,l)+", "+tn(j.current.temperature_2m)+(pp>=55||mm>=.5?" · "+l("rain likely","बारिश की संभावना","மழை வாய்ப்பு"):""),tag:"inix-test"});return out}
  const wet=k=>(H.precipitation_probability[k]||0)>=55||(H.precipitation[k]||0)>=.5;
  let a=H.time.indexOf(j.current.time.slice(0,13)+":00");if(a<0)a=hourNow;
  /* rain alert: dry now, wet in the next hour (fires once per rain start) */
  if(p.alerts!==false&&!wet(a)&&wet(a+1)){const chance=H.precipitation_probability[a+1]||0;
    out.push({title:"🌧️ "+l("Rain alert","बारिश अलर्ट","மழை எச்சரிக்கை")+" · "+place,body:l("Rain likely around "+h12((hourNow+1)%24)+" · "+chance+"% chance","लगभग "+h12((hourNow+1)%24)+" तक बारिश की संभावना · "+chance+"%",h12((hourNow+1)%24)+" அளவில் மழை வாய்ப்பு · "+chance+"%"),tag:"inix-rain"})}
  /* morning note + storm watch, once a day at DAILY_HOUR */
  if(hourNow===(p.dailyHour??DAILY_HOUR)){
    if(p.daily!==false){const pp=y.precipitation_probability_max[0]||0,mm=y.precipitation_sum[0]||0;
      if(pp>=55||mm>=.5)out.push({title:"🌧️ "+l("Rain today","आज बारिश","இன்று மழை")+" · "+place,body:pp+"% "+l("chance of rain","बारिश की संभावना","மழை வாய்ப்பு")+" · "+mm.toFixed(1)+" mm",tag:"inix-daily"});
      else out.push({title:wname(y.weather_code[0],l)+" · "+place,body:l("Today","आज","இன்று")+": "+tn(y.temperature_2m_min[0])+" – "+tn(y.temperature_2m_max[0])+" · "+l("No rain expected","बारिश की उम्मीद नहीं","மழை எதிர்பார்க்கப்படவில்லை"),tag:"inix-daily"})}
    if(p.alerts!==false){const g=Math.max(...y.wind_gusts_10m_max),off=p.coast?0:15,lvl=g>=90+off?3:g>=62+off?2:g>=45+off?1:0;
      if(lvl>=1){const nmv=[0,l("Watch","निगरानी","கண்காணிப்பு"),l("Alert","सतर्क","எச்சரிக்கை"),l("Severe","गंभीर","தீவிரம்")][lvl];
        out.push({title:"⛈️ "+l("Storm watch","तूफ़ान निगरानी","புயல் கண்காணிப்பு")+" · "+nmv+" · "+place,body:l("Max gust ","अधिकतम झोंका ","அதிகபட்ச காற்று ")+Math.round(g)+" km/h",tag:"inix-storm"})}}}
  return out}

const subs=parseSubs(process.env.PUSH_SUBSCRIPTIONS);
if(!subs.length){console.log("No subscriptions saved yet (PUSH_SUBSCRIPTIONS secret is empty).");process.exit(0)}
let sent=0,failed=0;
for(const [i,s] of subs.entries()){
  try{
    const sub=s.sub||s,p=s.p||{};
    if(!sub.endpoint||p.lat==null||p.lon==null){console.log("Phone "+(i+1)+": missing endpoint or location, skipped");continue}
    const msgs=decide(p,await weather(p));
    if(!msgs.length){console.log("Phone "+(i+1)+" ("+(p.name||"?")+"): nothing to send now");continue}
    for(const m of msgs){await webpush.sendNotification(sub,JSON.stringify({...m,url:SITE}),{TTL:3600,urgency:"high"});sent++;console.log("Phone "+(i+1)+": sent \""+m.title+"\"")}
  }catch(e){failed++;
    if(e&&(e.statusCode===404||e.statusCode===410))console.log("Phone "+(i+1)+": subscription expired. Open the app, turn Background push off and on, and update the secret.");
    else console.log("Phone "+(i+1)+": error "+(e&&(e.statusCode||e.message)))}}
console.log("Done. Sent "+sent+", failed "+failed+".");
if(failed&&!sent)process.exit(1);
