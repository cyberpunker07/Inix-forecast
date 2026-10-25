/* INIX Forecast – service worker: notification clicks, push, and background weather checks */
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){if("focus" in c)return c.focus()}
    return self.clients.openWindow(url)}))});
self.addEventListener("push",e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(x){d={title:"INIX Forecast",body:e.data?e.data.text():""}}
  e.waitUntil(self.registration.showNotification(d.title||"INIX Forecast",{body:d.body||"",tag:d.tag||"inix",icon:"icon-192.png",data:{url:d.url||"./"}}))});

/* ---- background check (Chrome periodic sync; works best when the app is installed to the home screen) ---- */
self.addEventListener("periodicsync",e=>{if(e.tag==="inix-check")e.waitUntil(bgCheck().catch(()=>{}))});
const rd=async k=>{try{const c=await caches.open("inix-prefs"),r=await c.match(k);return r?await r.json():null}catch(e){return null}};
const wr=async(k,v)=>{try{const c=await caches.open("inix-prefs");await c.put(k,new Response(JSON.stringify(v)))}catch(e){}};
const show=(title,body,tag)=>self.registration.showNotification(title,{body:body,tag:tag,renotify:true,icon:"icon-192.png",vibrate:[200,100,200],data:{url:"./"}});
function wname(c,l){const n=c===0?["Clear sky","साफ़ आसमान","தெளிவான வானம்"]:c<=2?["Partly cloudy","आंशिक बादल","பகுதி மேகமூட்டம்"]:c===3?["Cloudy","बादल छाए","மேகமூட்டம்"]:c<=48?["Fog","कोहरा","பனிமூட்டம்"]:c<=57?["Drizzle","बूंदाबांदी","தூறல்"]:c<=67?["Rain","बारिश","மழை"]:c<=77?["Snow","बर्फ़बारी","பனிப்பொழிவு"]:c<=82?["Rain showers","बारिश की बौछारें","மழைச் சாரல்"]:c<=86?["Snow showers","बर्फ़ की बौछारें","பனிச் சாரல்"]:["Thunderstorm","आंधी-तूफ़ान","இடியுடன் கூடிய மழை"];return l(n[0],n[1],n[2])}
async function bgCheck(){
  const pr=await rd("prefs.json");if(!pr||!(pr.daily||pr.alerts))return;
  const u="https://api.open-meteo.com/v1/forecast?latitude="+pr.lat+"&longitude="+pr.lon+"&current=temperature_2m,weather_code&hourly=precipitation_probability,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max&timezone=auto&forecast_days=3";
  const r=await fetch(u);if(!r.ok)return;const j=await r.json();
  const l=(en,hi,ta)=>pr.lang==="hi"?hi:pr.lang==="ta"?ta:en,tn=c=>Math.round(pr.unit==="F"?c*9/5+32:c)+"°";
  const place=pr.name,y=j.daily,now=Date.now(),last=(await rd("last.json"))||{};let dirty=false;
  /* daily summary: simple rain note, otherwise today's weather */
  if(pr.daily&&new Date().getHours()>=6&&last.daily!==y.time[0]){
    const pp=y.precipitation_probability_max[0]||0,mm=y.precipitation_sum[0]||0;
    if(pp>=55||mm>=.5)await show("🌧️ "+l("Rain today","आज बारिश","இன்று மழை")+" · "+place,pp+"% "+l("chance of rain","बारिश की संभावना","மழை வாய்ப்பு")+" · "+mm.toFixed(1)+" mm","inix-daily");
    else await show(wname(y.weather_code[0],l)+" · "+place,l("Today","आज","இன்று")+": "+tn(y.temperature_2m_min[0])+" – "+tn(y.temperature_2m_max[0])+" · "+l("No rain expected","बारिश की उम्मीद नहीं","மழை எதிர்பார்க்கப்படவில்லை"),"inix-daily");
    last.daily=y.time[0];dirty=true}
  if(pr.alerts){
    /* rain starting within 3 hours */
    const H=j.hourly;let a=H.time.indexOf(j.current.time.slice(0,13)+":00");if(a<0)a=0;let s0=-1;
    for(let s=0;s<=3&&a+s<H.time.length;s++){if((H.precipitation_probability[a+s]||0)>=55||(H.precipitation[a+s]||0)>=.5){s0=s;break}}
    if(s0>=0){const k=pr.en+"|"+(s0===0?"now":H.time[a+s0]);
      if(!(last.rain&&last.rain.k===k&&now-last.rain.t<6*36e5)){last.rain={k:k,t:now};dirty=true;
        await show("🌧️ "+l("Rain alert","बारिश अलर्ट","மழை எச்சரிக்கை")+" · "+place,s0===0?l("Raining now","अभी बारिश हो रही है","இப்போது மழை பெய்கிறது"):l("Rain starts in "+s0+"h","बारिश "+s0+" घंटे में शुरू","மழை "+s0+" மணி நேரத்தில் தொடங்கும்"),"inix-rain")}}
    /* storm watch: same levels as the Storm watch card */
    const g=Math.max.apply(null,y.wind_gusts_10m_max),off=pr.coast?0:15,lvl=g>=90+off?3:g>=62+off?2:g>=45+off?1:0;
    if(lvl>=1){const k=pr.en+"|"+lvl+"|"+y.time[0];
      if(!(last.storm&&last.storm.k===k&&now-last.storm.t<12*36e5)){last.storm={k:k,t:now};dirty=true;
        const nm=[0,l("Watch","निगरानी","கண்காணிப்பு"),l("Alert","सतर्क","எச்சரிக்கை"),l("Severe","गंभीर","தீவிரம்")][lvl];
        await show("⛈️ "+l("Storm watch","तूफ़ान निगरानी","புயல் கண்காணிப்பு")+" · "+nm+" · "+place,l("Max gust ","अधिकतम झोंका ","அதிகபட்ச காற்று ")+Math.round(g)+" km/h","inix-storm")}}}
  if(dirty)await wr("last.json",last)}
