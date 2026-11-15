"use strict";
/**
 * Aquaverse Intelligence Hub.
 * Reads the published HTML snapshots as the source of truth. No hardcoded KPIs,
 * no cross-period aggregation, and no backend or build step required.
 */
const REPORTS = [
  {id:"social",title:"Social media performance",file:"social.html",group:"marketing",icon:"◉",description:"Thailand and India reach, engagements, video views and content insights."},
  {id:"ads",title:"Meta advertising",file:"ads.html",group:"marketing",icon:"↗",description:"Thailand and India media spend, tracked outcomes and campaign recommendations."},
  {id:"listening",title:"Customer sentiment",file:"listening.html",group:"customer",icon:"♡",description:"Guest review ratings, customer feedback themes and service opportunities."},
  {id:"inquiry",title:"Customer inquiries",file:"inquiry.html",group:"customer",icon:"☷",description:"Inquiry volume, channel mix and the questions guests ask most."},
  {id:"competitor",title:"Competitor benchmark",file:"competitor.html",group:"market",icon:"◎",description:"Visibility, reviews and competitive benchmarking with coverage checks."},
  {id:"seller",title:"External ticket sellers",file:"seller.html",group:"market",icon:"▦",description:"Ticket distribution, reseller prices, marketplace availability and changes."},
  {id:"shopee",title:"Shopee performance",file:"shopee.html",group:"market",icon:"▤",description:"Marketplace sales, orders, conversion and operational improvement areas."},
  {id:"lazada",title:"Lazada performance",file:"lazada.html",group:"market",icon:"▧",description:"Marketplace revenue, conversion, efficiency and advertising insights."},
  {id:"seo",title:"SEO performance",file:"seo.html",group:"marketing",icon:"⌕",description:"Organic search visibility, keyword rankings and recommended SEO actions."}
];
const state={data:{},filter:"all",loading:false};
const $=sel=>document.querySelector(sel);
const text=(node)=>node?.textContent?.replace(/\s+/g," ").trim()||"";
const numeric=str=>{const s=String(str??"").trim();return s&&!/^(n\/a|—|–|unavailable|null|none|no usable data)$/i.test(s)?s:null};
const num=str=>{const v=Number(String(str??"").replace(/[^\d.\-]/g,""));return Number.isFinite(v)?v:null};
const short=str=>{const n=num(str);return n===null?"Unavailable":Math.abs(n)>=1e6?(n/1e6).toFixed(2).replace(/\.00$/,"")+"M":Math.abs(n)>=1e3?(n/1e3).toFixed(1).replace(/\.0$/,"")+"K":n.toLocaleString("en-US")};
const clean=str=>text({textContent:str});
const metric=(root,selector,labelSelector,valueSelector,label)=> {
  const match=[...root.querySelectorAll(selector)].find(el=>text(el.querySelector(labelSelector)).toLowerCase()===label.toLowerCase());
  return numeric(text(match?.querySelector(valueSelector)));
};
function nestedDocument(doc,index){
  const frame=doc.querySelectorAll("iframe[srcdoc]")[index];
  if(!frame)return null;
  return new DOMParser().parseFromString(frame.getAttribute("srcdoc"),"text/html");
}
function extractSocial(doc){
  const markets=["Thailand","India"].map((name,i)=>{
    const d=nestedDocument(doc,i);
    if(!d)return{name,missing:true};
    const get=l=>metric(d,".card.kpi",".head h3",".body .value",l);
    const period=text(d.querySelector(".header .sub"));
    return{name,reach:get("Reach"),engagements:get("Engagements"),views:get("Video Views"),rate:get("Engagement Rate"),period:period.match(/Comparison is\s+(.+?)\./i)?.[1]||period,missing:false};
  });
  return {markets,period:markets[0]?.period||"See full report"};
}
function extractAds(doc){
  const markets=["Thailand","India"].map((name,i)=>{
    const d=nestedDocument(doc,i);
    if(!d)return{name,missing:true};
    const get=l=>metric(d,".cards .card","span","strong",l);
    const period=text(d.querySelector(".cards .card small"))||"See full report";
    return{name,spend:get("Amount spent"),reach:get("Reach"),clicks:get("Link clicks"),purchases:get("Purchases"),leads:get("Tracked leads"),messages:get("Messages started"),period,missing:false};
  });
  return {markets,period:markets[0]?.period||"See full report"};
}
function extractListening(doc){
  const get=l=>metric(doc,".metric-card",".metric-label",".metric-value",l);
  const strong=[...doc.querySelectorAll(".summary-content strong")].map(text);
  return {reviews:get("Total Reviews"),rating:get("Average Rating"),positive:get("4–5★ Reviews"),complaintReviews:get("Reviews With Complaint Text"),period:text(doc.querySelector(".report-period"))||"See full report",topPositive:strong[2]||null,topProblem:strong[3]||null};
}
function extractInquiry(doc){
  const get=l=>metric(doc,".kpi-card",".kpi-header",".kpi-number",l);
  const intent=doc.querySelector(".intent-row .intent-name");
  const generated=text(doc.body).match(/generated\s*[·:]\s*([^\n]+)$/i)?.[1]||null;
  return{inquiries:get("Total inquiries"),coverage:get("Coverage"),topFive:get("Top 5 total"),topIntent:text(intent)||null,messenger:metric(doc,".source-item",".source-name",".source-percent","Messenger"),period:generated?"Generated "+generated:"Month to date (see report)"};
}
function extractCompetitor(doc){
  const get=l=>metric(doc,".summary-grid .summary-card",".label",".value",l);
  const quality=text(doc.querySelector(".notice"));
  const coverage=quality.match(/(\d+\/\d+) competitors currently have enough comparable/i)?.[1]||null;
  return {tracked:get("Tracked competitors"),leader:get("Overall leader"),position:get("Your position"),coverage,period:"Report snapshot · see full report"};
}
function extractSeller(doc){
  const get=l=>metric(doc,".metrics .metric","span","b",l);
  const stamp=text(doc.querySelector(".hero p,.intro p,header p"))+" "+text(doc.body).slice(0,350);
  return{tracked:get("Tracked sources"),live:get("Live/readable"),priceRead:get("Sources with prices read"),technical:get("Technical / review"),changes:get("Market changes"),period:stamp.match(/Generated\s+(\d{4}-\d{2}-\d{2}[^\s.]*)/i)?.[1]||"See full report"};
}
function extractCommerce(doc){
  const get=l=>metric(doc,".metric",".metric-label",".metric-value",l);
  const priority=text([...doc.querySelectorAll("p")].find(p=>text(p).startsWith("Top Priority:"))).replace(/^Top Priority:\s*/,"");
  return{revenue:get("Revenue"),orders:get("Orders"),traffic:get("Traffic"),conversion:get("Conversion Rate"),roas:get("ROAS"),priority,period:text(doc.querySelector("h1")).match(/\(([^)]+)\)/)?.[1]||"See full report"};
}
function extractSeo(doc){
  const ranking=text(doc.querySelector(".report-content"));
  const date=text(doc.querySelector(".meta-item"))||text(doc.querySelector("h3"));
  return{status:ranking.includes("does not appear in the top results")?"Not in tracked top results":"See report",period:date.replace(/^Report date:\s*/i,"")||"See full report"};
}
function extract(id,doc){
  switch(id){
    case "social":return extractSocial(doc);
    case "ads":return extractAds(doc);
    case "listening":return extractListening(doc);
    case "inquiry":return extractInquiry(doc);
    case "competitor":return extractCompetitor(doc);
    case "seller":return extractSeller(doc);
    case "shopee":case "lazada":return extractCommerce(doc);
    case "seo":return extractSeo(doc);
  }
  return {};
}
const escapeHTML=str=>String(str??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function kpi(label,value,foot,glyph,empty=false){
  return '<article class="kpi-tile'+(empty?' tile-no-data':'')+'"><div class="tile-head"><span>'+escapeHTML(label)+'</span><span class="tile-glyph">'+glyph+'</span></div><div class="tile-number">'+escapeHTML(value)+'</div><div class="tile-foot">'+escapeHTML(foot)+'</div></article>';
}
function renderKPIs(){
  const d=state.data,th=d.social?.markets?.[0],i=d.inquiry,l=d.listening,a=d.ads?.markets?.[0];
  $("#kpi-grid").innerHTML=[
    kpi("Social reach · Thailand",th?.reach?short(th.reach):"Unavailable",th?.period||"Social report not available","◉",!th?.reach),
    kpi("Average guest rating",l?.rating?l.rating+" / 5":"Unavailable",l?.reviews?l.reviews+" reviews · "+l.period:"Listening report not available","☆",!l?.rating),
    kpi("Customer inquiries",i?.inquiries?num(i.inquiries).toLocaleString("en-US"):"Unavailable",i?.period||"Inquiry report not available","☷",!i?.inquiries),
    kpi("Meta spend · Thailand",a?.spend?a.spend:"Unavailable",a?.period||"Ads report not available","↗",!a?.spend)
  ].join("");
}
function renderHighlights(){
  const social=state.data.social,listen=state.data.listening;
  if(!social?.markets?.some(m=>m.reach)){
    $("#social-highlights").innerHTML='<p>Social report metrics unavailable. Open the full report for details.</p>';
  } else {
    const ms=social.markets.filter(m=>m.reach);
    const top=Math.max(...ms.map(m=>num(m.reach)||0),1);
    $("#social-highlights").innerHTML=ms.map(m=>
      '<div class="bar-unit"><div class="bar-top"><span>'+escapeHTML(m.name)+'</span><strong>'+escapeHTML(short(m.reach))+' reach</strong></div><div class="bar-track"><div class="bar-fill '+(m.name==="India"?"india":"")+'" style="width:'+Math.max(2,Math.min(100,(num(m.reach)||0)/top*100))+'%"></div></div><div class="bar-foot">'+escapeHTML(m.rate||"No engagement rate")+' engagement rate · '+escapeHTML(m.period)+'</div></div>'
    ).join("")+'<p class="panel-subnote">Separate market metrics shown individually. The bars compare the displayed reach figures, not a combined audience.</p>';
  }
  if(!listen?.rating){$("#sentiment-highlights").innerHTML='<p>Listening report metrics unavailable. Open the full report for details.</p>';return;}
  $("#sentiment-highlights").innerHTML=
    '<div class="sentiment-stat"><div class="sentiment-rating">'+escapeHTML(listen.rating)+'</div><div><div class="sentiment-stars">★★★★★</div><div class="sentiment-count">'+escapeHTML(listen.reviews||"—")+' captured reviews · '+escapeHTML(listen.period)+'</div></div></div><div class="theme-list">'+
    (listen.topPositive?'<div class="theme-line"><span class="theme-dot"></span><span><strong>Most discussed positive:</strong> '+escapeHTML(listen.topPositive)+'</span></div>':'')+
    (listen.topProblem?'<div class="theme-line"><span class="theme-dot warning"></span><span><strong>Improvement opportunity:</strong> '+escapeHTML(listen.topProblem)+'</span></div>':'')+'</div>';
}
function renderWatchlist(){
  const d=state.data;
  const items=[];
  if(d.competitor?.coverage&&d.competitor.coverage.startsWith("0/"))items.push({title:"Competitor visibility data is incomplete",detail:"Only "+d.competitor.coverage+" competitors have enough comparable visibility dimensions to rank. Do not interpret missing rankings as underperformance.",id:"competitor"});
  if(d.listening?.topProblem)items.push({title:"Guest feedback: "+d.listening.topProblem,detail:"Highlighted as the biggest improvement opportunity in the customer listening report. Period: "+d.listening.period+".",id:"listening"});
  if(d.seller?.technical&&num(d.seller.technical)>0)items.push({title:d.seller.technical+" seller sources require technical review",detail:"Marketplace access failures do not prove sellers are inactive. "+(d.seller.changes||"Unavailable")+" market changes reported.",id:"seller"});
  if(d.shopee?.priority)items.push({title:"Shopee: review operational priorities",detail:d.shopee.priority+" · Historical period: "+d.shopee.period,id:"shopee"});
  if(d.seo?.status==="Not in tracked top results")items.push({title:"Tracked SEO keywords need attention",detail:"SEO export reports no target-domain ranking in the tracked top results. "+d.seo.period+".",id:"seo"});
  if(!items.length)items.push({title:"No source-backed alerts available",detail:"Metrics are still loading or the reports do not expose extractable action items.",id:null});
  $("#watchlist").innerHTML=items.slice(0,5).map(x=>
    '<div class="watch-item"><div class="watch-symbol'+(x.id===null?' neutral':'')+'">!</div><div class="watch-copy"><strong>'+escapeHTML(x.title)+'</strong><span>'+escapeHTML(x.detail)+'</span></div>'+(x.id?'<a href="#'+x.id+'" data-route="'+x.id+'">Explore ↗</a>':'')+'</div>'
  ).join("");
}
function summarize(id){
  const d=state.data[id];if(!d)return "Unable to read snapshot";
  if(id==="social")return (d.markets||[]).map(m=>m.reach?m.name+": "+short(m.reach)+" reach":null).filter(Boolean).join(" · ")||"Metrics unavailable";
  if(id==="ads")return (d.markets||[]).map(m=>m.spend?m.name+": "+m.spend:null).filter(Boolean).join(" · ")||"Metrics unavailable";
  if(id==="listening")return d.rating?d.rating+"/5 average rating":"Rating unavailable";
  if(id==="inquiry")return d.inquiries?short(d.inquiries)+" inquiries":"Inquiries unavailable";
  if(id==="competitor")return d.coverage?d.coverage+" rankable competitors":"Benchmark coverage unavailable";
  if(id==="seller")return d.tracked?d.tracked+" tracked sources":"Seller coverage unavailable";
  if(id==="shopee"||id==="lazada")return d.revenue?"THB "+Number(d.revenue).toLocaleString("en-US",{maximumFractionDigits:0})+" revenue":"Revenue unavailable";
  if(id==="seo")return d.status||"SEO status unavailable";
  return "View details";
}
function periodFor(id){
  const d=state.data[id];
  return d?.period||"Report snapshot · period unavailable";
}
function renderLibrary(){
  const reports=REPORTS.filter(r=>state.filter==="all"||r.group===state.filter);
  $("#library-count").textContent=String(reports.length).padStart(2,"0");
  $("#report-grid").innerHTML=reports.map(r=>
    '<a class="report-card" href="#'+r.id+'" data-route="'+r.id+'"><div class="report-card-top"><span class="report-icon">'+r.icon+'</span><span class="report-arrow">↗</span></div><h3>'+escapeHTML(r.title)+'</h3><p>'+escapeHTML(r.description)+'</p><div class="report-card-bottom"><span>'+escapeHTML(periodFor(r.id))+'</span><strong>'+escapeHTML(summarize(r.id))+'</strong></div></a>'
  ).join("");
}
function renderOverview(){renderKPIs();renderHighlights();renderWatchlist();renderLibrary();}
async function loadData(force=false){
  if(state.loading)return;
  state.loading=true;
  $("#sync-label").textContent="Reading source reports…";
  $("#refresh-data").disabled=true;
  const results=await Promise.all(REPORTS.map(async r=>{
    try {
      const response=await fetch(r.file+(force?"?v="+Date.now():""),{cache:force?"no-store":"default"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const source=await response.text();
      const doc=new DOMParser().parseFromString(source,"text/html");
      return{id:r.id,data:extract(r.id,doc),ok:true};
    }catch(e){return{id:r.id,error:e,ok:false};}
  }));
  const failed=[];
  for(const result of results){
    if(result.ok)state.data[result.id]=result.data;
    else {failed.push(result.id);if(!state.data[result.id])state.data[result.id]=null;}
  }
  state.loading=false;
  $("#refresh-data").disabled=false;
  $("#connected-count").textContent=(REPORTS.length-failed.length)+" of "+REPORTS.length+" report snapshots read";
  $("#sync-label").textContent=failed.length?failed.length+" report(s) unavailable":"Updated "+new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  renderOverview();
  const active=routeId();if(active!=="overview")$("#report-period").textContent=periodFor(active);
}
function routeId(){
  let hash="overview";try{hash=decodeURIComponent(location.hash.slice(1)||"overview");}catch(_){}
  return REPORTS.some(r=>r.id===hash)?hash:"overview";
}
function route(){
  const id=routeId(),isOverview=id==="overview";
  $("#overview-page").hidden=!isOverview;$("#report-page").hidden=isOverview;
  document.querySelectorAll("[data-route]").forEach(el=>{
    if(el.classList.contains("nav-item")){el.classList.toggle("active",el.dataset.route===id);if(el.dataset.route===id)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");}
  });
  const found=REPORTS.find(r=>r.id===id);
  $("#breadcrumb-current").textContent=isOverview?"Overview":found.title;
  if(isOverview){$("#report-viewer").removeAttribute("src");window.scrollTo({top:0});return;}
  $("#report-title").textContent=found.title;
  $("#report-description").textContent=found.description;
  $("#report-category").textContent=(found.group==="marketing"?"GROWTH & MARKETING":found.group==="customer"?"CUSTOMER INTELLIGENCE":"MARKET & SALES")+" / FULL REPORT";
  $("#report-period").textContent=periodFor(id);
  $("#open-report").href=found.file;
  const viewer=$("#report-viewer");
  if(viewer.getAttribute("src")!==found.file)viewer.src=found.file;
  window.scrollTo({top:0});
}
$("#report-filters").addEventListener("click",event=>{
  const btn=event.target.closest("[data-filter]");if(!btn)return;
  state.filter=btn.dataset.filter;
  document.querySelectorAll(".filter-btn").forEach(b=>{const active=b===btn;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active));});
  renderLibrary();
});
$("#refresh-data").addEventListener("click",()=>loadData(true));
$("#reload-report").addEventListener("click",()=>{
  const id=routeId();const found=REPORTS.find(r=>r.id===id);if(found)$("#report-viewer").src=found.file+"?v="+Date.now();
});
$("#back-overview").addEventListener("click",()=>location.hash="#overview");
window.addEventListener("hashchange",route);
route();loadData();
