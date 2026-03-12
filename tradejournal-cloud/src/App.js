import { useState, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// THEMES — Premium dark/light
// ═══════════════════════════════════════════════════════════
const DARK = {
  bg:"#05080f", surface:"#080d18", card:"#0c1221",
  card2:"#101828", border:"#162035", border2:"#1e2d45",
  text:"#f1f5ff", textMid:"#7b92b8", textDim:"#2e3f5c",
  accent:"#3d7eff", accentGlow:"#3d7eff20",
  green:"#00d68f", greenBg:"#00d68f12", greenGlow:"#00d68f30",
  red:"#ff3d6b", redBg:"#ff3d6b12", redGlow:"#ff3d6b30",
  yellow:"#ffb020", yellowBg:"#ffb02012",
  purple:"#9b6dff", purpleBg:"#9b6dff12",
  cyan:"#00c8e0", cyanBg:"#00c8e012",
  orange:"#ff7a30", orangeBg:"#ff7a3012",
  pink:"#ff4d9e", pinkBg:"#ff4d9e12",
  headerBg:"#05080fee",
  gradA:"#3d7eff", gradB:"#9b6dff",
};
const LIGHT = {
  bg:"#eef2fa", surface:"#ffffff", card:"#f5f8ff",
  card2:"#edf1fb", border:"#dae2f5", border2:"#c8d5ee",
  text:"#0a1628", textMid:"#4a6080", textDim:"#9db0cc",
  accent:"#2563eb", accentGlow:"#2563eb18",
  green:"#00a870", greenBg:"#00a87010", greenGlow:"#00a87030",
  red:"#e02050", redBg:"#e0205010", redGlow:"#e0205030",
  yellow:"#c87800", yellowBg:"#c8780010",
  purple:"#6d3be8", purpleBg:"#6d3be810",
  cyan:"#0098b0", cyanBg:"#0098b010",
  orange:"#d95e00", orangeBg:"#d95e0010",
  pink:"#c0006e", pinkBg:"#c0006e10",
  headerBg:"#eef2faee",
  gradA:"#2563eb", gradB:"#6d3be8",
};

// ═══════════════════════════════════════════════════════════
// BROKERAGE CALCULATOR — Exact Zerodha Official Rates
// Source: zerodha.com/charges/ verified March 2026
// ═══════════════════════════════════════════════════════════
function calcCharges(trade) {
  const { type, market, entry, exit, qty, direction } = trade;
  if (!exit || !entry || !qty || exit === 0) return 0;

  const buyPrice  = direction === "LONG" ? entry : exit;
  const sellPrice = direction === "LONG" ? exit  : entry;
  const buyVal    = buyPrice  * qty;
  const sellVal   = sellPrice * qty;

  const sym = String(trade.symbol || "").toUpperCase();

  // ── F&O Options (CE / PE) ───────────────────────────────
  if (
    type === "Options" ||
    (market === "NFO" && (sym.endsWith("CE") || sym.endsWith("PE")))
  ) {
    const brokerage  = 20 + 20;                          // ₹20 flat × 2 orders
    const stt        = sellVal * 0.0015;                 // 0.15% on sell premium (verified)
    const txn        = (buyVal + sellVal) * 0.0003503;   // NSE 0.03503% on premium
    const sebi       = (buyVal + sellVal) * 0.000001;    // ₹10/crore
    const stamp      = buyVal * 0.00003;                 // 0.003% on buy side
    const gst        = (brokerage + txn + sebi) * 0.18;
    return Math.round((brokerage + stt + txn + sebi + stamp + gst) * 100) / 100;
  }

  // ── F&O Futures ─────────────────────────────────────────
  if (type === "Futures" || type === "F&O" || market === "NFO") {
    const brokerage  = Math.min(20, buyVal * 0.0003) + Math.min(20, sellVal * 0.0003);
    const stt        = sellVal * 0.0002;                 // 0.02% on sell side
    const txn        = (buyVal + sellVal) * 0.0000183;   // NSE 0.00183%
    const sebi       = (buyVal + sellVal) * 0.000001;
    const stamp      = buyVal * 0.00002;                 // 0.002% on buy side
    const gst        = (brokerage + txn + sebi) * 0.18;
    return Math.round((brokerage + stt + txn + sebi + stamp + gst) * 100) / 100;
  }

  // ── Commodity MCX ────────────────────────────────────────
  if (market === "MCX" || type === "Commodity") {
    const brokerage  = Math.min(20, buyVal * 0.0003) + Math.min(20, sellVal * 0.0003);
    const ctt        = sellVal * 0.0001;                 // CTT 0.01% non-agri sell
    const txn        = (buyVal + sellVal) * 0.000021;    // MCX 0.0021%
    const sebi       = (buyVal + sellVal) * 0.000001;
    const stamp      = buyVal * 0.00002;
    const gst        = (brokerage + txn + sebi) * 0.18;
    return Math.round((brokerage + ctt + txn + sebi + stamp + gst) * 100) / 100;
  }

  // ── Equity Intraday (NSE/BSE MIS) ───────────────────────
  const brokerage  = Math.min(20, buyVal * 0.0003) + Math.min(20, sellVal * 0.0003);
  const stt        = sellVal * 0.00025;                  // 0.025% sell side only
  const txn        = (buyVal + sellVal) * 0.0000307;     // NSE 0.00307%
  const sebi       = (buyVal + sellVal) * 0.000001;
  const stamp      = buyVal * 0.00003;                   // 0.003% buy side
  const gst        = (brokerage + txn + sebi) * 0.18;
  return Math.round((brokerage + stt + txn + sebi + stamp + gst) * 100) / 100;
}

// Charges breakdown for tooltip display
function calcChargesBreakdown(trade) {
  const { type, market, entry, exit, qty, direction } = trade;
  if (!exit || !entry || !qty) return null;
  const buyPrice  = direction === "LONG" ? entry : exit;
  const sellPrice = direction === "LONG" ? exit  : entry;
  const buyVal    = buyPrice  * qty;
  const sellVal   = sellPrice * qty;
  const sym = String(trade.symbol || "").toUpperCase();
  let brokerage, stt_ctt, txn, sebi, stamp, label;

  if (type === "Options" || (market === "NFO" && (sym.endsWith("CE") || sym.endsWith("PE")))) {
    brokerage = 40; stt_ctt = sellVal * 0.0015; txn = (buyVal + sellVal) * 0.0003503;
    sebi = (buyVal + sellVal) * 0.000001; stamp = buyVal * 0.00003; label = "F&O Options";
  } else if (type === "Futures" || type === "F&O" || market === "NFO") {
    brokerage = Math.min(20, buyVal*0.0003)+Math.min(20, sellVal*0.0003);
    stt_ctt = sellVal*0.0002; txn = (buyVal+sellVal)*0.0000183;
    sebi = (buyVal+sellVal)*0.000001; stamp = buyVal*0.00002; label = "F&O Futures";
  } else if (market === "MCX" || type === "Commodity") {
    brokerage = Math.min(20, buyVal*0.0003)+Math.min(20, sellVal*0.0003);
    stt_ctt = sellVal*0.0001; txn = (buyVal+sellVal)*0.000021;
    sebi = (buyVal+sellVal)*0.000001; stamp = buyVal*0.00002; label = "Commodity MCX";
  } else {
    brokerage = Math.min(20, buyVal*0.0003)+Math.min(20, sellVal*0.0003);
    stt_ctt = sellVal*0.00025; txn = (buyVal+sellVal)*0.0000307;
    sebi = (buyVal+sellVal)*0.000001; stamp = buyVal*0.00003; label = "Equity Intraday";
  }
  const gst = (brokerage + txn + sebi) * 0.18;
  const total = brokerage + stt_ctt + txn + sebi + stamp + gst;
  const r = v => Math.round(v * 100) / 100;
  return { label, brokerage:r(brokerage), stt_ctt:r(stt_ctt), txn:r(txn), sebi:r(sebi), stamp:r(stamp), gst:r(gst), total:r(total) };
}

function pnl(t) {
  if (!t.exit || !t.entry || !t.qty) return 0;
  const raw = t.direction === "LONG"
    ? (t.exit - t.entry) * t.qty
    : (t.entry - t.exit) * t.qty;
  const charges = t.charges ?? calcCharges(t);
  return Math.round((raw - charges) * 100) / 100;
}
function pnlPct(t) {
  if (!t.exit || !t.entry || !t.qty) return 0;
  return ((pnl(t) / (t.entry * t.qty)) * 100).toFixed(2);
}
const fmt = n => {
  const abs = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+₹${abs}` : `-₹${abs}`;
};
const fmtN = n => `₹${Math.abs(Number(n)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// On Vercel: API routes are on same domain (/api/...)
// On local: falls back to localhost:5000
const API = process.env.REACT_APP_API_URL !== undefined
  ? process.env.REACT_APP_API_URL
  : (window.location.hostname === "localhost" ? "http://localhost:5000" : "");

// ═══════════════════════════════════════════════════════════
// SETUP & LOSS REASON OPTIONS
// ═══════════════════════════════════════════════════════════
const ENTRY_SETUPS = ["SMT","Order Block","FVG","IFVG","Breaker Block","BOS","CHOCH","Liquidity Sweep","Displacement","Fair Value Gap","Premium/Discount","Support/Resistance","EMA Crossover","VWAP Bounce","Opening Range","Gap & Go","Bull Flag","Cup & Handle","Ascending Triangle","Custom"];
const LOSS_REASONS = ["Early Entry","Premium Decay","Setup Didn't Work","Unknown","High Volatility","RBI Policy","News Impact","Wrong Analysis","Wrong Entry","Overtraded","FOMO Entry","Revenge Trade","No SL Set","Slippage","Gap Against","Custom"];
const EMOTIONS = ["Confident","Focused","Calm","Excited","Neutral","Nervous","Fearful","Greedy","FOMO","Revenge","Overconfident","Impatient"];
const STRATEGIES = ["SMC","Price Action","Scalping","Breakout","Momentum","Mean Reversion","Trend Following","Hedging","BTST","Positional","Options Selling","Spread","Custom"];

// ═══════════════════════════════════════════════════════════
// STORAGE (localStorage)
// ═══════════════════════════════════════════════════════════
function useTrades() {
  const [trades, setTrades] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tj_trades") || "[]"); } catch { return []; }
  });
  const save = useCallback(ts => {
    setTrades(ts);
    try { localStorage.setItem("tj_trades", JSON.stringify(ts)); } catch {}
  }, []);
  return [trades, save];
}
function useSettings() {
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tj_settings") || '{"theme":"dark","currency":"INR","broker":"Zerodha","name":"","gsheetsUrl":""}'); } catch { return { theme:"dark", currency:"INR", broker:"Zerodha", name:"", gsheetsUrl:"" }; }
  });
  const save = s => { setSettings(s); try { localStorage.setItem("tj_settings", JSON.stringify(s)); } catch {} };
  return [settings, save];
}

// ═══════════════════════════════════════════════════════════
// DATE RANGE FILTER
// ═══════════════════════════════════════════════════════════
function DateRangeFilter({ from, to, onChange, T }) {
  const presets = [
    { l:"Today", f:0, t:0 },
    { l:"This Week", f:7, t:0 },
    { l:"This Month", f:30, t:0 },
    { l:"3 Months", f:90, t:0 },
    { l:"6 Months", f:180, t:0 },
    { l:"This Year", f:365, t:0 },
    { l:"All", f:null, t:null },
  ];
  const setPreset = p => {
    if (p.f === null) { onChange(null, null); return; }
    const t = new Date(); const f = new Date(); f.setDate(f.getDate() - p.f);
    onChange(f.toISOString().slice(0,10), t.toISOString().slice(0,10));
  };
  return (
    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
      {presets.map(p => (
        <button key={p.l} onClick={()=>setPreset(p)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${T.border}`,background:"transparent",color:T.textMid,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=T.accent}
          onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>{p.l}</button>
      ))}
      <input type="date" value={from||""} onChange={e=>onChange(e.target.value,to)} style={{padding:"5px 8px",background:T.card,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:11,fontFamily:"inherit",outline:"none"}}/>
      <span style={{color:T.textDim,fontSize:11}}>→</span>
      <input type="date" value={to||""} onChange={e=>onChange(from,e.target.value)} style={{padding:"5px 8px",background:T.card,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:11,fontFamily:"inherit",outline:"none"}}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SVG CHARTS
// ═══════════════════════════════════════════════════════════
function EquityCurve({ trades, T, h=130 }) {
  const pts = useMemo(()=>{
    const closed = [...trades].filter(t=>t.status==="CLOSED"&&t.exit).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let cum=0; return closed.map((t,i)=>{cum+=pnl(t);return{x:i,y:cum,t};});
  },[trades]);
  if(pts.length<2) return <div style={{color:T.textDim,fontSize:11,padding:20,textAlign:"center"}}>Log more trades to see equity curve</div>;
  const W=700,H=h;
  const minY=Math.min(0,...pts.map(p=>p.y)), maxY=Math.max(1,...pts.map(p=>p.y));
  const range=maxY-minY||1;
  const xs=i=>(i/(pts.length-1))*W, ys=y=>H-((y-minY)/range)*(H-12)-6;
  const line=pts.map(p=>`${xs(p.x)},${ys(p.y)}`).join(" ");
  const area=`${xs(0)},${H} `+line+` ${xs(pts.length-1)},${H}`;
  const isPos=pts[pts.length-1].y>=0, col=isPos?T.green:T.red;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:"block"}}>
      <defs>
        <linearGradient id="ecg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={col} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1="0" y1={ys(0)} x2={W} y2={ys(0)} stroke={T.border2} strokeWidth="1" strokeDasharray="4,4"/>
      <polygon points={area} fill="url(#ecg)"/>
      <polyline points={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.filter((_,i)=>i===0||i===pts.length-1||(i%Math.max(1,Math.floor(pts.length/6))===0)).map((p,i)=>(
        <circle key={i} cx={xs(p.x)} cy={ys(p.y)} r="3" fill={col} opacity="0.8"/>
      ))}
    </svg>
  );
}

function BarChart({ data, T, h=100, labelKey="label", valKey="value" }) {
  const vals=data.map(d=>d[valKey]); const max=Math.max(...vals.map(Math.abs))||1;
  const W=580, bw=Math.floor((W-data.length*2)/Math.max(data.length,1));
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${h+20}`} style={{display:"block"}}>
      {data.map((d,i)=>{
        const v=d[valKey], bh=(Math.abs(v)/max)*(h/2), col=v>=0?T.green:T.red;
        const x=i*(bw+2), y=v>=0?h/2-bh:h/2;
        return <g key={i}>
          <rect x={x} y={y} width={bw} height={Math.max(bh,1)} fill={col+"cc"} rx={2}/>
          <text x={x+bw/2} y={h+14} textAnchor="middle" fontSize="8" fill={T.textDim}>{d[labelKey]}</text>
        </g>;
      })}
      <line x1="0" y1={h/2} x2={W} y2={h/2} stroke={T.border2} strokeWidth="1"/>
    </svg>
  );
}

function DonutChart({ segs, T, size=90 }) {
  const total=segs.reduce((s,x)=>s+x.v,0)||1; const r=36,cx=45,cy=45,sw=11,circ=2*Math.PI*r;
  let off=0;
  return (
    <svg width={size} height={size} viewBox="0 0 90 90">
      {segs.map((s,i)=>{const d=(s.v/total)*circ;const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={sw} strokeDasharray={`${d} ${circ-d}`} strokeDashoffset={-off} strokeLinecap="butt" style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%"}}/>;off+=d;return el;})}
      <circle cx={cx} cy={cy} r={r-sw/2} fill={T.card}/>
    </svg>
  );
}

function Heatmap({ trades, T }) {
  const byDate={};
  trades.filter(t=>t.status==="CLOSED"&&t.exit).forEach(t=>{byDate[t.date]=(byDate[t.date]||0)+pnl(t);});
  const dates=Object.keys(byDate).sort().slice(-56);
  if(!dates.length) return <div style={{color:T.textDim,fontSize:11}}>No data</div>;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
      {dates.map(d=>{
        const v=byDate[d], intensity=Math.min(Math.abs(v)/8000,1);
        const col=v>0?T.green:T.red;
        const bg=v===0?T.border:col+Math.floor(intensity*180+40).toString(16).padStart(2,"0");
        return <div key={d} title={`${d}: ${fmt(v)}`} style={{width:13,height:13,borderRadius:2,background:bg,cursor:"pointer",transition:"transform 0.1s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.4)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>;
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BASE UI
// ═══════════════════════════════════════════════════════════
function Card({children,T,style={},title,sub,action,noPad,accent}){
  return (
    <div style={{background:T.card,border:`1px solid ${accent?accent+"40":T.border}`,borderRadius:14,padding:noPad?0:16,overflow:noPad?"hidden":"visible",borderTop:accent?`2px solid ${accent}`:undefined,...style}}>
      {(title||action)&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:noPad?"14px 16px 0":0}}>
        <div><div style={{fontSize:10,fontWeight:700,color:T.textMid,letterSpacing:1.5,textTransform:"uppercase"}}>{title}</div>{sub&&<div style={{fontSize:10,color:T.textDim,marginTop:2}}>{sub}</div>}</div>
        {action}
      </div>}
      {children}
    </div>
  );
}

function KPI({label,value,sub,color,T,icon,delta}){
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"16px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color||T.accent},transparent)`}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{fontSize:10,fontWeight:600,color:T.textMid,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>{label}</div>
        {icon&&<span style={{fontSize:18,opacity:0.7}}>{icon}</span>}
      </div>
      <div style={{fontSize:24,fontWeight:900,color:color||T.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:T.textDim,marginTop:6}}>{sub}</div>}
      {delta!==undefined&&<div style={{fontSize:10,color:delta>=0?T.green:T.red,marginTop:4,fontWeight:600}}>{delta>=0?"↑":"↓"} {Math.abs(delta)}% vs prev period</div>}
    </div>
  );
}

function Btn({children,T,variant="ghost",color,onClick,disabled,style={}}){
  const base={padding:"8px 16px",borderRadius:8,border:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,transition:"all 0.15s",opacity:disabled?0.5:1,...style};
  if(variant==="primary") return <button onClick={onClick} disabled={disabled} style={{...base,background:`linear-gradient(135deg,${T.gradA},${T.gradB})`,color:"#fff",boxShadow:`0 4px 14px ${T.accent}30`}}>{children}</button>;
  if(variant==="solid") return <button onClick={onClick} disabled={disabled} style={{...base,background:color||T.accent,color:"#fff"}}>{children}</button>;
  if(variant==="danger") return <button onClick={onClick} disabled={disabled} style={{...base,background:T.redBg,color:T.red,border:`1px solid ${T.red}30`}}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{...base,background:"transparent",color:color||T.textMid,border:`1px solid ${T.border}`}}>{children}</button>;
}

function Badge({label,color,bg,size=10}){
  return <span style={{padding:"2px 8px",borderRadius:4,fontSize:size,fontWeight:700,background:bg,color,letterSpacing:0.3,whiteSpace:"nowrap",display:"inline-block"}}>{label}</span>;
}

function Chip({label,selected,color,T,onClick}){
  return <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${selected?color:T.border}`,background:selected?color+"20":"transparent",color:selected?color:T.textMid,fontSize:10,fontWeight:selected?700:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>{label}</button>;
}

function FInput({label,T,...props}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:10,fontWeight:600,color:T.textMid,letterSpacing:0.8,textTransform:"uppercase"}}>{label}</label>}
      <input {...props} style={{padding:"9px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none",...props.style}}
        onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}/>
    </div>
  );
}
function FSel({label,T,children,...props}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:10,fontWeight:600,color:T.textMid,letterSpacing:0.8,textTransform:"uppercase"}}>{label}</label>}
      <select {...props} style={{padding:"9px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none",cursor:"pointer",...props.style}}>{children}</select>
    </div>
  );
}
function FText({label,T,...props}){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:10,fontWeight:600,color:T.textMid,letterSpacing:0.8,textTransform:"uppercase"}}>{label}</label>}
      <textarea {...props} style={{padding:"9px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none",resize:"vertical",minHeight:65,...props.style}}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TRADE FORM — Full featured
// ═══════════════════════════════════════════════════════════
function TradeForm({T,onSave,onClose,editTrade}){
  const blank={date:new Date().toISOString().slice(0,10),symbol:"",type:"Options",direction:"LONG",entry:"",exit:"",sl:"",target:"",qty:"",charges:"",strategy:"SMC",setup:[],timeframe:"5min",market:"NFO",emotion:"Neutral",lossReason:[],mistakes:"",notes:"",tags:"",exitReason:"Target Hit",status:"CLOSED"};
  const [f,setF]=useState(editTrade?{...editTrade,tags:Array.isArray(editTrade.tags)?editTrade.tags.join(", "):editTrade.tags||"",setup:Array.isArray(editTrade.setup)?editTrade.setup:editTrade.setup?[editTrade.setup]:[],lossReason:Array.isArray(editTrade.lossReason)?editTrade.lossReason:editTrade.lossReason?[editTrade.lossReason]:[]}:blank);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleArr=(k,v)=>setF(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));

  const autoCharges=calcCharges({...f,entry:+f.entry,exit:+f.exit||0,qty:+f.qty});
  const estPnl=f.exit?pnl({...f,entry:+f.entry,exit:+f.exit,qty:+f.qty,charges:f.charges?+f.charges:autoCharges}):0;
  const isLoss=estPnl<0;

  return (
    <div style={{position:"fixed",inset:0,zIndex:600,background:"#00000090",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"min(860px,96vw)",maxHeight:"94vh",overflow:"auto",background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,boxShadow:"0 32px 100px #00000070"}}>
        {/* Header */}
        <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.card,borderRadius:"18px 18px 0 0"}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:T.text}}>{editTrade?"Edit Trade":"Log New Trade"}</div>
            <div style={{fontSize:10,color:T.textDim,marginTop:2}}>NSE • BSE • NFO • MCX • CDS</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {f.exit&&<div style={{textAlign:"center",padding:"8px 18px",borderRadius:10,background:estPnl>=0?T.greenBg:T.redBg,border:`1px solid ${estPnl>=0?T.green:T.red}30`}}>
              <div style={{fontSize:9,color:T.textMid,marginBottom:2}}>EST. P&L (after charges)</div>
              <div style={{fontSize:20,fontWeight:900,color:estPnl>=0?T.green:T.red}}>{fmt(estPnl)}</div>
              <div style={{fontSize:9,color:T.textDim}}>Charges: ₹{f.charges||autoCharges.toFixed(2)}</div>
            </div>}
            <button onClick={onClose} style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",color:T.textMid,cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        </div>

        <div style={{padding:22,display:"flex",flexDirection:"column",gap:16}}>
          {/* Row 1 */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            <FInput label="Date" T={T} type="date" value={f.date} onChange={e=>set("date",e.target.value)}/>
            <FInput label="Symbol" T={T} placeholder="NIFTY24MAR22700CE" value={f.symbol} onChange={e=>set("symbol",e.target.value.toUpperCase())}/>
            <FSel label="Market" T={T} value={f.market} onChange={e=>set("market",e.target.value)}>
              {["NSE","BSE","NFO","MCX","CDS"].map(m=><option key={m}>{m}</option>)}
            </FSel>
            <FSel label="Type" T={T} value={f.type} onChange={e=>set("type",e.target.value)}>
              {["Options","Futures","Equity","Commodity","Currency"].map(m=><option key={m}>{m}</option>)}
            </FSel>
            <FSel label="Direction" T={T} value={f.direction} onChange={e=>set("direction",e.target.value)}>
              <option>LONG</option><option>SHORT</option>
            </FSel>
          </div>

          {/* Row 2 */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            <FInput label="Entry ₹" T={T} type="number" step="0.05" value={f.entry} onChange={e=>set("entry",e.target.value)}/>
            <FInput label="Exit ₹" T={T} type="number" step="0.05" value={f.exit} onChange={e=>set("exit",e.target.value)}/>
            <FInput label="Stop Loss ₹" T={T} type="number" step="0.05" value={f.sl} onChange={e=>set("sl",e.target.value)}/>
            <FInput label="Target ₹" T={T} type="number" step="0.05" value={f.target} onChange={e=>set("target",e.target.value)}/>
            <FInput label="Qty / Lots" T={T} type="number" value={f.qty} onChange={e=>set("qty",e.target.value)}/>
          </div>

          {/* Row 3 */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:T.textMid,letterSpacing:0.8,textTransform:"uppercase",marginBottom:5}}>Charges ₹</div>
              <input type="number" placeholder={`Auto: ${autoCharges.toFixed(2)}`} value={f.charges} onChange={e=>set("charges",e.target.value)}
                style={{width:"100%",padding:"9px 12px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none"}}
                onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}/>
              <div style={{fontSize:9,color:T.textDim,marginTop:3}}>Leave blank for auto-calc</div>
            </div>
            <FSel label="Strategy" T={T} value={f.strategy} onChange={e=>set("strategy",e.target.value)}>
              {STRATEGIES.map(s=><option key={s}>{s}</option>)}
            </FSel>
            <FSel label="Timeframe" T={T} value={f.timeframe} onChange={e=>set("timeframe",e.target.value)}>
              {["1min","3min","5min","15min","30min","1hr","2hr","4hr","Daily","Weekly","Monthly"].map(t=><option key={t}>{t}</option>)}
            </FSel>
            <FSel label="Exit Reason" T={T} value={f.exitReason} onChange={e=>set("exitReason",e.target.value)}>
              {["Target Hit","Stop Loss","Trailing SL","Time Exit","Manual Exit","Expiry","Partial Exit"].map(r=><option key={r}>{r}</option>)}
            </FSel>
            <FSel label="Status" T={T} value={f.status} onChange={e=>set("status",e.target.value)}>
              <option>CLOSED</option><option>OPEN</option><option>PARTIAL</option>
            </FSel>
          </div>

          {/* Entry Setup — Multi Select */}
          <div style={{padding:14,background:T.bg,borderRadius:10,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.cyan,marginBottom:10,letterSpacing:1}}>📐 ENTRY SETUP (Select all that apply)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {ENTRY_SETUPS.map(s=>(
                <Chip key={s} label={s} selected={f.setup.includes(s)} color={T.cyan} T={T} onClick={()=>toggleArr("setup",s)}/>
              ))}
            </div>
          </div>

          {/* Loss Reason — shown only if loss */}
          {(isLoss||f.lossReason?.length>0)&&(
            <div style={{padding:14,background:T.redBg,borderRadius:10,border:`1px solid ${T.red}30`}}>
              <div style={{fontSize:10,fontWeight:700,color:T.red,marginBottom:10,letterSpacing:1}}>❌ LOSS REASON (Select all that apply)</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {LOSS_REASONS.map(r=>(
                  <Chip key={r} label={r} selected={f.lossReason.includes(r)} color={T.red} T={T} onClick={()=>toggleArr("lossReason",r)}/>
                ))}
              </div>
            </div>
          )}

          {/* Psychology */}
          <div style={{padding:14,background:T.purpleBg,borderRadius:10,border:`1px solid ${T.purple}30`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.purple,marginBottom:10,letterSpacing:1}}>🧠 PSYCHOLOGY</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <div style={{fontSize:10,color:T.textMid,marginBottom:8,fontWeight:600}}>EMOTION BEFORE TRADE</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {EMOTIONS.map(e=>(
                    <Chip key={e} label={e} selected={f.emotion===e} color={T.purple} T={T} onClick={()=>set("emotion",e)}/>
                  ))}
                </div>
              </div>
              <FText label="Mistakes / Lessons" T={T} placeholder="What went wrong? Be brutally honest..." value={f.mistakes} onChange={e=>set("mistakes",e.target.value)}/>
            </div>
          </div>

          {/* Notes + Tags */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
            <FText label="Trade Notes & Reasoning" T={T} placeholder="Why did you take this trade? What was your thesis?" value={f.notes} onChange={e=>set("notes",e.target.value)}/>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <FInput label="Tags (comma separated)" T={T} placeholder="intraday, nifty, smc" value={f.tags} onChange={e=>set("tags",e.target.value)}/>
              <div style={{padding:10,background:T.bg,borderRadius:8,border:`1px solid ${T.border}`,fontSize:10,color:T.textDim,lineHeight:1.6}}>
                💡 Charges auto-calculated using Zerodha F&O intraday rates. Override if needed.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
            <Btn T={T} onClick={onClose}>Cancel</Btn>
            <Btn T={T} variant="primary" onClick={()=>onSave({
              ...f, id:editTrade?.id||Date.now(),
              entry:+f.entry, exit:f.exit?+f.exit:null,
              qty:+f.qty, sl:+f.sl||null, target:+f.target||null,
              charges:f.charges?+f.charges:autoCharges,
              tags:typeof f.tags==="string"?f.tags.split(",").map(t=>t.trim()).filter(Boolean):f.tags,
            })}>
              {editTrade?"Update Trade ✓":"Save Trade ✓"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function Dashboard({trades,T,profile,dateFrom,dateTo}){
  const filtered=trades.filter(t=>{
    if(!dateFrom&&!dateTo) return true;
    const d=t.date; return (!dateFrom||d>=dateFrom)&&(!dateTo||d<=dateTo);
  });
  const closed=filtered.filter(t=>t.status==="CLOSED"&&t.exit);
  const totalPnL=closed.reduce((s,t)=>s+pnl(t),0);
  const wins=closed.filter(t=>pnl(t)>0), losses=closed.filter(t=>pnl(t)<0);
  const winRate=closed.length?(wins.length/closed.length*100).toFixed(1):0;
  const avgWin=wins.length?wins.reduce((s,t)=>s+pnl(t),0)/wins.length:0;
  const avgLoss=losses.length?Math.abs(losses.reduce((s,t)=>s+pnl(t),0)/losses.length):0;
  const pf=avgLoss>0?(avgWin*wins.length/(avgLoss*losses.length)).toFixed(2):"∞";
  const expectancy=closed.length?((winRate/100*avgWin)-((1-winRate/100)*avgLoss)).toFixed(0):0;
  const open=trades.filter(t=>t.status==="OPEN");
  const totalCharges=closed.reduce((s,t)=>s+(t.charges||0),0);

  // Max Drawdown
  const maxDD=useMemo(()=>{
    let peak=0,cum=0,dd=0;
    [...closed].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(t=>{cum+=pnl(t);if(cum>peak)peak=cum;dd=Math.min(dd,cum-peak);});
    return dd;
  },[closed]);

  // Consecutive streaks
  const {maxWS,maxLS}=useMemo(()=>{
    let ws=0,ls=0,maxWS=0,maxLS=0;
    [...closed].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(t=>{
      if(pnl(t)>0){ws++;ls=0;maxWS=Math.max(maxWS,ws);}else{ls++;ws=0;maxLS=Math.max(maxLS,ls);}
    });
    return {maxWS,maxLS};
  },[closed]);

  // Monthly P&L
  const monthly=useMemo(()=>{
    const m={};
    closed.forEach(t=>{const k=t.date.slice(0,7);m[k]=(m[k]||0)+pnl(t);});
    return Object.entries(m).sort().slice(-8).map(([k,v])=>({label:k.slice(5),value:v}));
  },[closed]);

  // By Setup
  const bySetup=useMemo(()=>{
    const s={};
    closed.forEach(t=>(t.setup||[]).forEach(su=>{if(!s[su])s[su]={wins:0,losses:0,pnl:0};if(pnl(t)>0)s[su].wins++;else s[su].losses++;s[su].pnl+=pnl(t);}));
    return Object.entries(s).sort((a,b)=>b[1].pnl-a[1].pnl);
  },[closed]);

  // By Emotion
  const byEmotion=useMemo(()=>{
    const e={};
    closed.forEach(t=>{if(!e[t.emotion])e[t.emotion]={count:0,pnl:0,wins:0};e[t.emotion].count++;e[t.emotion].pnl+=pnl(t);if(pnl(t)>0)e[t.emotion].wins++;});
    return Object.entries(e).sort((a,b)=>b[1].pnl-a[1].pnl);
  },[closed]);

  // Loss Reasons
  const byLossReason=useMemo(()=>{
    const r={};
    losses.forEach(t=>(t.lossReason||[]).forEach(lr=>{r[lr]=(r[lr]||0)+1;}));
    return Object.entries(r).sort((a,b)=>b[1]-a[1]);
  },[losses]);

  // Day of week
  const byDay=useMemo(()=>{
    const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const d=days.map(l=>({label:l,value:0,count:0}));
    closed.forEach(t=>{const i=new Date(t.date).getDay();d[i].value+=pnl(t);d[i].count++;});
    return d;
  },[closed]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {profile&&(
        <div style={{padding:"12px 18px",background:`linear-gradient(135deg,${T.accent}15,${T.purple}15)`,borderRadius:12,border:`1px solid ${T.accent}30`,display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${T.gradA},${T.gradB})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#fff",fontSize:16}}>{profile.user_name?.slice(0,1)}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:T.text}}>Welcome back, {profile.user_name}!</div>
            <div style={{fontSize:10,color:T.textDim}}>{profile.user_id} • {profile.email} • {profile.broker}</div>
          </div>
          <Badge label="● Live — Zerodha Connected" color={T.green} bg={T.greenBg} size={11}/>
        </div>
      )}

      {/* KPI Row 1 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KPI T={T} icon="💰" label="Total Net P&L" value={fmt(totalPnL)} sub={`${closed.length} closed trades`} color={totalPnL>=0?T.green:T.red}/>
        <KPI T={T} icon="🎯" label="Win Rate" value={`${winRate}%`} sub={`${wins.length} wins / ${losses.length} losses`} color={winRate>=50?T.green:T.red}/>
        <KPI T={T} icon="⚖️" label="Profit Factor" value={pf} sub={`Expectancy: ₹${expectancy}/trade`} color={pf>=1.5?T.green:T.yellow}/>
        <KPI T={T} icon="📉" label="Max Drawdown" value={fmt(maxDD)} sub={`Total charges: ${fmtN(totalCharges)}`} color={T.red}/>
      </div>

      {/* KPI Row 2 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <KPI T={T} icon="📈" label="Avg Win" value={fmtN(avgWin)} sub={`Best: ${wins.length?fmt(Math.max(...wins.map(t=>pnl(t)))):"—"}`} color={T.green}/>
        <KPI T={T} icon="📉" label="Avg Loss" value={fmtN(avgLoss)} sub={`Worst: ${losses.length?fmt(Math.min(...losses.map(t=>pnl(t)))):"—"}`} color={T.red}/>
        <KPI T={T} icon="🔥" label="Win / Loss Streak" value={`${maxWS}W / ${maxLS}L`} sub="Max consecutive" color={T.orange}/>
        <KPI T={T} icon="🔓" label="Open Positions" value={open.length} sub={open.slice(0,2).map(t=>t.symbol).join(", ")||"None"} color={T.yellow}/>
      </div>

      {/* Equity Curve */}
      <Card T={T} title="Equity Curve" sub="Cumulative net P&L over time" accent={T.accent}>
        <EquityCurve trades={filtered} T={T}/>
      </Card>

      {/* Charts */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <Card T={T} title="Monthly P&L" sub="Net profit/loss by month" accent={T.green}>
          <BarChart data={monthly} T={T} h={100}/>
        </Card>
        <Card T={T} title="Win / Loss Split" accent={T.purple}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <DonutChart T={T} segs={[{v:wins.length,c:T.green},{v:losses.length,c:T.red},{v:Math.max(0,closed.length-wins.length-losses.length),c:T.yellow}]} size={90}/>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[{l:"Wins",v:wins.length,c:T.green},{l:"Losses",v:losses.length,c:T.red}].map(s=>(
                <div key={s.l} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:10,height:10,borderRadius:2,background:s.c}}/>
                  <span style={{fontSize:11,color:T.textMid}}>{s.l}</span>
                  <span style={{fontSize:14,fontWeight:800,color:s.c}}>{s.v}</span>
                </div>
              ))}
              <div style={{fontSize:10,color:T.textDim}}>R:R = {avgLoss>0?(avgWin/avgLoss).toFixed(2):"∞"}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Setup + Emotion */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card T={T} title="Performance by Setup" sub="Which setups make you money?" accent={T.cyan}>
          {bySetup.length===0?<div style={{color:T.textDim,fontSize:11}}>Tag your setups in trades to see this.</div>:
          bySetup.map(([s,v])=>(
            <div key={s} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:T.bg,borderRadius:7,marginBottom:5,borderLeft:`3px solid ${v.pnl>=0?T.green:T.red}`}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:T.text}}>{s}</div>
                <div style={{fontSize:9,color:T.textDim}}>{v.wins}W / {v.losses}L • WR: {v.wins+v.losses>0?((v.wins/(v.wins+v.losses))*100).toFixed(0):0}%</div>
              </div>
              <span style={{fontSize:12,fontWeight:800,color:v.pnl>=0?T.green:T.red}}>{fmt(v.pnl)}</span>
            </div>
          ))}
        </Card>

        <Card T={T} title="🧠 Emotion Analysis" sub="How your mindset affects P&L" accent={T.purple}>
          {byEmotion.length===0?<div style={{color:T.textDim,fontSize:11}}>Log emotions in trades to see this.</div>:
          byEmotion.map(([e,v])=>(
            <div key={e} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:T.bg,borderRadius:7,marginBottom:5}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:T.text}}>{e}</div>
                <div style={{fontSize:9,color:T.textDim}}>{v.count} trades • WR: {v.count>0?((v.wins/v.count)*100).toFixed(0):0}%</div>
              </div>
              <span style={{fontSize:12,fontWeight:800,color:v.pnl>=0?T.green:T.red}}>{fmt(v.pnl)}</span>
            </div>
          ))}
          <div style={{marginTop:8,padding:"8px 10px",background:T.purpleBg,borderRadius:7,fontSize:10,color:T.purple,lineHeight:1.5}}>
            💡 {byEmotion[0]?`Best mindset: "${byEmotion[0][0]}" — ${fmt(byEmotion[0][1].pnl)}`:"Add emotion tags to trades"}
          </div>
        </Card>
      </div>

      {/* Day of Week + Loss Reasons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Card T={T} title="P&L by Day of Week" sub="Best days to trade" accent={T.yellow}>
          <BarChart data={byDay} T={T} h={90}/>
        </Card>
        <Card T={T} title="❌ Loss Reason Analysis" sub="Why are you losing?" accent={T.red}>
          {byLossReason.length===0?<div style={{color:T.textDim,fontSize:11}}>Tag loss reasons to see patterns.</div>:
          byLossReason.map(([r,cnt])=>(
            <div key={r} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:T.bg,borderRadius:7,marginBottom:5,borderLeft:`3px solid ${T.red}`}}>
              <span style={{fontSize:11,color:T.text}}>{r}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:60,height:4,background:T.border,borderRadius:2}}>
                  <div style={{width:`${(cnt/losses.length)*100}%`,height:"100%",background:T.red,borderRadius:2}}/>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:T.red}}>{cnt}x</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Heatmap */}
      <Card T={T} title="P&L Calendar Heatmap" sub="Green = profit day • Red = loss day • Hover for details" accent={T.accent}>
        <Heatmap trades={filtered} T={T}/>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TRADE LOG
// ═══════════════════════════════════════════════════════════
function TradeLog({trades,T,onEdit,onDelete,onAdd,onImport,onImportCSV,importing,dateFrom,dateTo}){
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("All");
  const [fResult,setFResult]=useState("All");
  const [sort,setSort]=useState({col:"date",dir:-1});

  const filtered=useMemo(()=>trades.filter(t=>{
    const inDate=(!dateFrom||t.date>=dateFrom)&&(!dateTo||t.date<=dateTo);
    const inType=fType==="All"||t.type===fType;
    const p=pnl(t);
    const inResult=fResult==="All"||(fResult==="WIN"?p>0:fResult==="LOSS"?p<0:t.status===fResult);
    const inSearch=!search||t.symbol?.toUpperCase().includes(search.toUpperCase())||t.strategy?.toLowerCase().includes(search.toLowerCase())||(t.setup||[]).join(",").toLowerCase().includes(search.toLowerCase());
    return inDate&&inType&&inResult&&inSearch;
  }).sort((a,b)=>{
    const av=a[sort.col],bv=b[sort.col];
    return (av>bv?1:-1)*sort.dir;
  }),[trades,dateFrom,dateTo,fType,fResult,search,sort]);

  const sortBy=col=>setSort(s=>({col,dir:s.col===col?-s.dir:-1}));
  const totalPnL=filtered.reduce((s,t)=>t.status==="CLOSED"?s+pnl(t):s,0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Filters */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Symbol, strategy, setup..."
          style={{padding:"8px 12px",background:T.card,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:12,fontFamily:"inherit",outline:"none",width:220}}/>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {["All","Equity","Options","Futures","Commodity"].map(f=>(
            <Chip key={f} label={f} selected={fType===f} color={T.accent} T={T} onClick={()=>setFType(f)}/>
          ))}
        </div>
        <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
          {["All","WIN","LOSS","OPEN"].map(f=>(
            <Chip key={f} label={f} selected={fResult===f} color={f==="WIN"?T.green:f==="LOSS"?T.red:f==="OPEN"?T.yellow:T.accent} T={T} onClick={()=>setFResult(f)}/>
          ))}
        </div>
        <div style={{padding:"6px 14px",borderRadius:8,background:totalPnL>=0?T.greenBg:T.redBg}}>
          <span style={{fontSize:11,color:T.textMid}}>Filtered P&L: </span>
          <span style={{fontSize:13,fontWeight:800,color:totalPnL>=0?T.green:T.red}}>{fmt(totalPnL)}</span>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <Btn T={T} variant="solid" color={T.green} onClick={onImport} disabled={importing}>{importing?"⏳ Importing...":"⬇️ Today's Orders"}</Btn>
        <label style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.cyan}`,background:T.cyanBg,color:T.cyan,fontWeight:600,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
          📂 Import Historical CSV
          <input type="file" accept=".csv" style={{display:"none"}} onChange={onImportCSV}/>
        </label>
        <Btn T={T} variant="primary" onClick={onAdd}>+ Log Trade</Btn>
      </div>

      <Card T={T} noPad>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:T.bg}}>
                {[["date","Date"],["symbol","Symbol"],["type","Type"],["direction","Dir"],["entry","Entry"],["exit","Exit"],["qty","Qty"],["charges","Charges"],[null,"P&L"],[null,"P&L%"],["strategy","Strategy"],[null,"Setup"],[null,"Emotion"],[null,"Loss Reason"],[null,"Actions"]].map(([col,h])=>(
                  <th key={h} onClick={()=>col&&sortBy(col)} style={{padding:"10px 12px",textAlign:"left",fontSize:9,color:T.textMid,fontWeight:700,letterSpacing:0.8,cursor:col?"pointer":"default",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",userSelect:"none"}}>
                    {h}{col&&sort.col===col?(sort.dir===1?" ↑":" ↓"):""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t,i)=>{
                const p=pnl(t);
                return (
                  <tr key={t.id} style={{borderBottom:`1px solid ${T.border}20`,background:i%2===0?"transparent":T.bg+"50",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.accentGlow}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":T.bg+"50"}>
                    <td style={{padding:"9px 12px",color:T.textMid,fontSize:11}}>{t.date}</td>
                    <td style={{padding:"9px 12px"}}>
                      <div style={{fontWeight:800,color:T.text,fontSize:12}}>{t.symbol}</div>
                      <div style={{fontSize:9,color:T.textDim}}>{t.market}</div>
                    </td>
                    <td style={{padding:"9px 12px"}}><Badge label={t.type} color={T.cyan} bg={T.cyanBg}/></td>
                    <td style={{padding:"9px 12px"}}><Badge label={t.direction} color={t.direction==="LONG"?T.green:T.red} bg={t.direction==="LONG"?T.greenBg:T.redBg}/></td>
                    <td style={{padding:"9px 12px",color:T.text}}>₹{t.entry?.toLocaleString()}</td>
                    <td style={{padding:"9px 12px",color:T.text}}>{t.exit?`₹${t.exit?.toLocaleString()}`:<span style={{color:T.yellow,fontSize:10}}>OPEN</span>}</td>
                    <td style={{padding:"9px 12px",color:T.textMid}}>{t.qty}</td>
                    <td style={{padding:"9px 12px",color:T.textDim,fontSize:11}}>₹{(t.charges||0).toFixed(2)}</td>
                    <td style={{padding:"9px 12px",fontWeight:800,color:p>=0?T.green:T.red}}>{t.exit?fmt(p):"—"}</td>
                    <td style={{padding:"9px 12px",color:p>=0?T.green:T.red,fontSize:11}}>{t.exit?`${pnlPct(t)}%`:"—"}</td>
                    <td style={{padding:"9px 12px",color:T.textMid,fontSize:11}}>{t.strategy}</td>
                    <td style={{padding:"9px 12px",maxWidth:120}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                        {(t.setup||[]).slice(0,2).map(s=><Badge key={s} label={s} color={T.cyan} bg={T.cyanBg}/>)}
                        {(t.setup||[]).length>2&&<Badge label={`+${(t.setup||[]).length-2}`} color={T.textDim} bg={T.border}/>}
                      </div>
                    </td>
                    <td style={{padding:"9px 12px",fontSize:10,color:["Confident","Focused","Calm"].includes(t.emotion)?T.green:["FOMO","Revenge","Fearful","Greedy"].includes(t.emotion)?T.red:T.yellow}}>{t.emotion}</td>
                    <td style={{padding:"9px 12px",maxWidth:110}}>
                      {(t.lossReason||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:2}}>
                        {(t.lossReason||[]).slice(0,1).map(r=><Badge key={r} label={r} color={T.red} bg={T.redBg}/>)}
                        {(t.lossReason||[]).length>1&&<Badge label={`+${(t.lossReason||[]).length-1}`} color={T.textDim} bg={T.border}/>}
                      </div>}
                    </td>
                    <td style={{padding:"9px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>onEdit(t)} style={{padding:"3px 10px",borderRadius:5,border:`1px solid ${T.border}`,background:"transparent",color:T.accent,fontSize:10,cursor:"pointer"}}>Edit</button>
                        <button onClick={()=>onDelete(t.id)} style={{padding:"3px 10px",borderRadius:5,border:`1px solid ${T.border}`,background:"transparent",color:T.red,fontSize:10,cursor:"pointer"}}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{padding:48,textAlign:"center",color:T.textDim,fontSize:12}}>No trades found. Click "Import from Zerodha" or "+ Log Trade"</div>}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS PANEL
// ═══════════════════════════════════════════════════════════
function SettingsPanel({T,settings,onSave,trades,onLogout}){
  const [s,setS]=useState(settings);
  const set=(k,v)=>setS(p=>({...p,[k]:v}));
  const [backupStatus,setBackupStatus]=useState("");

  const exportCSV=()=>{
    const headers=["Date","Symbol","Market","Type","Direction","Entry","Exit","Qty","Charges","P&L","Strategy","Setup","Emotion","Loss Reason","Notes","Status"];
    const rows=trades.map(t=>[t.date,t.symbol,t.market,t.type,t.direction,t.entry,t.exit||"",t.qty,(t.charges||0).toFixed(2),pnl(t).toFixed(2),t.strategy,(t.setup||[]).join("|"),t.emotion,(t.lossReason||[]).join("|"),`"${(t.notes||"").replace(/"/g,'""')}"`,t.status]);
    const csv=[headers,...rows].map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`trades_${new Date().toISOString().slice(0,10)}.csv`;a.click();
    URL.revokeObjectURL(url);
  };

  const backupToGSheets=async()=>{
    if(!s.gsheetsUrl){setBackupStatus("❌ Please add Google Sheets webhook URL first.");return;}
    setBackupStatus("⏳ Sending to Google Sheets...");
    try{
      // Route through server.js to avoid browser CORS restrictions
      const r=await fetch(`${API}/api/backup-gsheets`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          webhookUrl:s.gsheetsUrl,
          trades:trades.map(t=>({...t,pnl:pnl(t).toFixed(2),charges:(t.charges||0).toFixed(2),setup:(t.setup||[]).join("|"),lossReason:(t.lossReason||[]).join("|")}))
        })
      });
      const d=await r.json();
      if(d.success){setBackupStatus("✅ Backed up "+trades.length+" trades to Google Sheets!");}
      else{setBackupStatus("❌ Backup failed: "+(d.error||"Unknown error"));}
    }catch(e){setBackupStatus("❌ Backup failed: "+e.message+". Is server.js running?");}
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:700}}>
      <Card T={T} title="Profile Settings" accent={T.accent}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FInput label="Your Name" T={T} placeholder="Manthan Sarkar" value={s.name} onChange={e=>set("name",e.target.value)}/>
          <FInput label="Broker" T={T} placeholder="Zerodha" value={s.broker} onChange={e=>set("broker",e.target.value)}/>
        </div>
      </Card>

      <Card T={T} title="📊 Google Sheets Auto Backup" sub="Automatically backup all trades to your Google Sheet" accent={T.green}>
        <div style={{marginBottom:10,fontSize:11,color:T.textMid,lineHeight:1.7}}>
          Steps: 1) Open Google Sheets → Extensions → Apps Script → paste a doPost webhook → deploy as web app → copy the URL below.
        </div>
        <FInput label="Google Sheets Webhook URL" T={T} placeholder="https://script.google.com/macros/s/..." value={s.gsheetsUrl} onChange={e=>set("gsheetsUrl",e.target.value)}/>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <Btn T={T} variant="solid" color={T.green} onClick={backupToGSheets}>☁️ Backup Now to Google Sheets</Btn>
          {backupStatus&&<div style={{fontSize:11,color:backupStatus.includes("✅")?T.green:T.red,display:"flex",alignItems:"center"}}>{backupStatus}</div>}
        </div>
      </Card>

      <Card T={T} title="📁 Export / Import" accent={T.cyan}>
        <div style={{display:"flex",gap:10}}>
          <Btn T={T} variant="solid" color={T.cyan} onClick={exportCSV}>⬇️ Export Trades as CSV</Btn>
        </div>
        <div style={{marginTop:10,fontSize:11,color:T.textDim}}>CSV includes all trade data including P&L, setups, emotions, loss reasons.</div>
      </Card>

      <Card T={T} title="⚠️ Danger Zone" accent={T.red}>
        <div style={{display:"flex",gap:10}}>
          <Btn T={T} variant="danger" onClick={()=>{if(window.confirm("Logout from Zerodha? Server must restart for re-login."))onLogout();}}>🔐 Logout Zerodha</Btn>
        </div>
      </Card>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <Btn T={T} variant="primary" onClick={()=>onSave(s)}>Save Settings ✓</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App(){
  const [settings,saveSettings]=useSettings();
  const [theme,setTheme]=useState(settings.theme||"dark");
  const T=theme==="dark"?DARK:LIGHT;
  const [trades,saveTrades]=useTrades();
  const [view,setView]=useState("dashboard");
  const [showForm,setShowForm]=useState(false);
  const [editTrade,setEditTrade]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loggedIn,setLoggedIn]=useState(false);
  const [checkingLogin,setCheckingLogin]=useState(true);
  const [importing,setImporting]=useState(false);
  const [dateFrom,setDateFrom]=useState(null);
  const [dateTo,setDateTo]=useState(null);

  // Check login
  useEffect(()=>{
    fetch(`${API}/api/status`).then(r=>r.json()).then(d=>{if(d.loggedIn){setLoggedIn(true);loadProfile();}}).catch(()=>{}).finally(()=>setCheckingLogin(false));
    const p=new URLSearchParams(window.location.search);
    if(p.get("login")==="success"){setLoggedIn(true);loadProfile();window.history.replaceState({},"",window.location.pathname);}
  },[]);

  const loadProfile=async()=>{try{const r=await fetch(`${API}/api/profile`);const d=await r.json();if(d.user_id)setProfile(d);}catch{}};

  const importFromZerodha=async()=>{
    setImporting(true);
    try{
      const r=await fetch(`${API}/api/orders`);const orders=await r.json();
      if(Array.isArray(orders)&&orders.length>0){
        const grouped={};
        orders.forEach(o=>{if(o.status!=="COMPLETE")return;const key=`${o.tradingsymbol}_${o.order_timestamp?.slice(0,10)}`;if(!grouped[key])grouped[key]=[];grouped[key].push(o);});
        const imported=[];
        Object.entries(grouped).forEach(([key,ords])=>{
          const buys=ords.filter(o=>o.transaction_type==="BUY"),sells=ords.filter(o=>o.transaction_type==="SELL");
          if(buys.length>0&&sells.length>0){
            const avgBuy=buys.reduce((s,o)=>s+o.average_price*o.quantity,0)/buys.reduce((s,o)=>s+o.quantity,0);
            const avgSell=sells.reduce((s,o)=>s+o.average_price*o.quantity,0)/sells.reduce((s,o)=>s+o.quantity,0);
            const qty=Math.min(buys.reduce((s,o)=>s+o.quantity,0),sells.reduce((s,o)=>s+o.quantity,0));
            const market=ords[0].exchange;
            const t={id:Date.now()+Math.random(),date:ords[0].order_timestamp?.slice(0,10),symbol:ords[0].tradingsymbol,type:market==="MCX"?"Commodity":market==="NFO"?"Options":"Equity",direction:"LONG",entry:avgBuy,exit:avgSell,qty,market,strategy:"Auto-Imported",setup:[],lossReason:[],emotion:"Neutral",mistakes:"",notes:`Auto-imported. Orders: ${ords.map(o=>o.order_id).join(", ")}`,tags:["zerodha","auto-import"],exitReason:"Manual Exit",status:"CLOSED",zerodhaImport:true};
            t.charges=calcCharges(t);
            imported.push(t);
          }
        });
        const existing=new Set(trades.filter(t=>t.zerodhaImport).map(t=>t.symbol+t.date));
        const newTrades=imported.filter(t=>!existing.has(t.symbol+t.date));
        saveTrades([...trades,...newTrades]);
        alert(`✅ Imported ${newTrades.length} new trades from Zerodha!`);
      }else{alert("No completed orders found today.");}
    }catch(e){alert("Import failed: "+e.message);}
    setImporting(false);
  };

  const importCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const r = await fetch(`${API}/api/import-csv`, { method: "POST", body: formData });
      const data = await r.json();
      if (data.success && data.trades?.length > 0) {
        const existing = new Set(trades.map(t => t.symbol + t.date));
        const newT = data.trades
          .filter(t => !existing.has(t.symbol + t.date))
          .map(t => ({
            ...t,
            id: Date.now() + Math.random(),
            strategy: "CSV Import", setup: [], lossReason: [],
            emotion: "Neutral", mistakes: "", notes: `Imported from CSV: ${file.name}`,
            tags: ["csv-import"], exitReason: t.status === "CLOSED" ? "Manual Exit" : "",
            charges: calcCharges({ ...t }),
            zerodhaImport: true,
          }));
        saveTrades([...trades, ...newT]);
        alert(`✅ Imported ${newT.length} new trades from CSV!\n(${data.trades.length - newT.length} duplicates skipped)`);
      } else {
        alert(data.error || "No trades found in CSV. Make sure it's a Zerodha tradebook CSV.");
      }
    } catch (err) {
      alert("CSV import failed: " + err.message + "\nMake sure server.js is running.");
    }
    e.target.value = "";
  };
  const saveTrade=t=>{saveTrades(editTrade?trades.map(x=>x.id===t.id?t:x):[...trades,t]);setShowForm(false);setEditTrade(null);};
  const deleteTrade=id=>{if(window.confirm("Delete this trade?"))saveTrades(trades.filter(t=>t.id!==id));};
  const openEdit=t=>{setEditTrade(t);setShowForm(true);};
  const openAdd=()=>{setEditTrade(null);setShowForm(true);};

  const closed=trades.filter(t=>t.status==="CLOSED"&&t.exit);
  const totalPnL=closed.reduce((s,t)=>s+pnl(t),0);
  const wins=closed.filter(t=>pnl(t)>0);
  const winRate=closed.length?(wins.length/closed.length*100).toFixed(1):0;

  const NAV=[
    {id:"dashboard",label:"Dashboard",icon:"⬡"},
    {id:"tradelog",label:"Trade Log",icon:"📋"},
    {id:"positions",label:"Positions",icon:"🔴"},
    {id:"holdings",label:"Holdings",icon:"💼"},
    {id:"margins",label:"Margins",icon:"🏦"},
    {id:"settings",label:"Settings",icon:"⚙️"},
  ];

  if(checkingLogin) return <div style={{minHeight:"100vh",background:DARK.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:32,height:32,border:`3px solid ${DARK.border}`,borderTop:`3px solid ${DARK.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  if(!loggedIn) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{width:440,padding:44,background:T.card,border:`1px solid ${T.border}`,borderRadius:22,textAlign:"center",boxShadow:"0 32px 80px #00000040"}}>
        <div style={{width:64,height:64,borderRadius:18,background:`linear-gradient(135deg,${T.gradA},${T.gradB})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:900,color:"#fff",margin:"0 auto 20px",boxShadow:`0 8px 24px ${T.accent}40`}}>TJ</div>
        <div style={{fontSize:26,fontWeight:900,color:T.text,marginBottom:8,letterSpacing:-0.5}}>TradeJournal Pro</div>
        <div style={{fontSize:12,color:T.textMid,marginBottom:32,lineHeight:1.7}}>Professional trading journal with Zerodha integration. Track every trade, analyse patterns, improve performance.</div>
        <button onClick={async()=>{try{const r=await fetch(`${API}/api/login-url`);const d=await r.json();if(d.url){window.open(d.url,"_blank","width=520,height=640");const poll=setInterval(async()=>{try{const s=await fetch(`${API}/api/status`);const st=await s.json();if(st.loggedIn){clearInterval(poll);setLoggedIn(true);loadProfile();}}catch{}},2000);setTimeout(()=>clearInterval(poll),120000);}}catch(e){alert("Cannot connect to server. Start server.js first.");}}}
          style={{width:"100%",padding:14,borderRadius:12,border:"none",background:`linear-gradient(135deg,${T.gradA},${T.gradB})`,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 6px 20px ${T.accent}40`,marginBottom:16}}>
          🔐 Login with Zerodha
        </button>
        <div style={{fontSize:10,color:T.textDim,lineHeight:1.6}}>🔒 Credentials handled by Zerodha. We never store your password.</div>
        <div style={{marginTop:16,padding:12,background:T.bg,borderRadius:8,fontSize:10,color:T.textDim,textAlign:"left",lineHeight:1.7}}>
          <div style={{fontWeight:700,color:T.textMid,marginBottom:4}}>Prerequisites:</div>
          <div>1. Run: <code style={{color:T.accent}}>node E:\MarketPulse-Pro\server.js</code></div>
          <div>2. Keep CMD window open</div>
          <div>3. Then click Login above</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"'Outfit','Plus Jakarta Sans',system-ui,sans-serif",background:T.bg,color:T.text,minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <header style={{position:"sticky",top:0,zIndex:200,background:T.headerBg,backdropFilter:"blur(16px)",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 22px",height:54,gap:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:28,flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${T.gradA},${T.gradB})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff",boxShadow:`0 4px 12px ${T.accent}40`}}>TJ</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:T.text,letterSpacing:-0.3}}>TradeJournal Pro</div>
            <div style={{fontSize:8,color:T.green,letterSpacing:0.5}}>● Zerodha Connected</div>
          </div>
        </div>

        <nav style={{display:"flex",gap:1,flex:1,overflowX:"auto"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{padding:"6px 14px",borderRadius:7,border:"none",cursor:"pointer",background:view===n.id?T.accentGlow:"transparent",color:view===n.id?T.accent:T.textMid,fontSize:11,fontWeight:view===n.id?700:400,fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>

        {/* Quick Stats */}
        <div style={{display:"flex",gap:20,alignItems:"center",flexShrink:0,marginRight:16}}>
          {[{l:"Net P&L",v:fmt(totalPnL),c:totalPnL>=0?T.green:T.red},{l:"Win Rate",v:`${winRate}%`,c:winRate>=50?T.green:T.red},{l:"Trades",v:closed.length,c:T.text}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontSize:8,color:T.textDim,letterSpacing:0.5}}>{s.l}</div>
              <div style={{fontSize:12,fontWeight:800,color:s.c,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          {profile&&<div style={{fontSize:10,color:T.textMid}}>👤 {profile.user_name}</div>}
          <button onClick={()=>{const nt=theme==="dark"?"light":"dark";setTheme(nt);saveSettings({...settings,theme:nt});}}
            style={{width:38,height:21,borderRadius:11,border:`1px solid ${T.border}`,background:theme==="dark"?T.accent:T.border,cursor:"pointer",position:"relative",transition:"all 0.3s",flexShrink:0}}>
            <div style={{position:"absolute",top:2,left:theme==="dark"?18:2,width:15,height:15,borderRadius:"50%",background:"#fff",transition:"left 0.3s",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center"}}>{theme==="dark"?"🌙":"☀️"}</div>
          </button>
        </div>
      </header>

      {/* DATE RANGE BAR */}
      {["dashboard","tradelog"].includes(view)&&(
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"8px 22px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:600,color:T.textMid,letterSpacing:0.8,marginRight:4}}>DATE RANGE:</span>
          <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f,t)=>{setDateFrom(f);setDateTo(t);}} T={T}/>
        </div>
      )}

      {/* MAIN */}
      <main style={{padding:"18px 22px",maxWidth:1500,margin:"0 auto"}}>
        {view==="dashboard"&&<Dashboard trades={trades} T={T} profile={profile} dateFrom={dateFrom} dateTo={dateTo}/>}
        {view==="tradelog"&&<TradeLog trades={trades} T={T} onEdit={openEdit} onDelete={deleteTrade} onAdd={openAdd} onImport={importFromZerodha} onImportCSV={importCSV} importing={importing} dateFrom={dateFrom} dateTo={dateTo}/>}
        {view==="positions"&&<PositionsView T={T}/>}
        {view==="holdings"&&<HoldingsView T={T}/>}
        {view==="margins"&&<MarginsView T={T}/>}
        {view==="settings"&&<SettingsPanel T={T} settings={settings} onSave={s=>{saveSettings(s);alert("Settings saved!");}} trades={trades} onLogout={()=>{setLoggedIn(false);setProfile(null);}}/>}
      </main>

      {showForm&&<TradeForm T={T} onSave={saveTrade} onClose={()=>{setShowForm(false);setEditTrade(null);}} editTrade={editTrade}/>}

      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}select option{background:${T.surface}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LIVE DATA VIEWS (Zerodha)
// ═══════════════════════════════════════════════════════════
function PositionsView({T}){
  const [data,setData]=useState({net:[],day:[]});const[tab,setTab]=useState("net");const[loading,setLoading]=useState(true);
  useEffect(()=>{fetch(`${API}/api/positions`).then(r=>r.json()).then(d=>setData(d||{net:[],day:[]})).catch(()=>{}).finally(()=>setLoading(false));},[]);
  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}><div style={{width:28,height:28,border:`3px solid ${T.border}`,borderTop:`3px solid ${T.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
  const positions=data[tab]||[];
  const totalPnL=positions.reduce((s,p)=>s+(p.pnl||0),0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {["net","day"].map(t=><Chip key={t} label={t==="net"?"Net Positions":"Day Positions"} selected={tab===t} color={T.accent} T={T} onClick={()=>setTab(t)}/>)}
        <div style={{marginLeft:"auto",padding:"7px 16px",borderRadius:9,background:totalPnL>=0?T.greenBg:T.redBg,border:`1px solid ${totalPnL>=0?T.green:T.red}30`}}>
          <span style={{fontSize:11,color:T.textMid}}>Total P&L: </span><span style={{fontSize:14,fontWeight:800,color:totalPnL>=0?T.green:T.red}}>{fmt(totalPnL)}</span>
        </div>
      </div>
      <Card T={T} noPad>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:T.bg}}>{["Symbol","Product","Qty","Avg Price","LTP","P&L","Day Chg","Value"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:9,color:T.textMid,fontWeight:700,borderBottom:`1px solid ${T.border}`,letterSpacing:0.8}}>{h}</th>)}</tr></thead>
            <tbody>{positions.length===0?<tr><td colSpan={8} style={{padding:40,textAlign:"center",color:T.textDim}}>No {tab} positions found.</td></tr>:positions.map((p,i)=>(
              <tr key={p.tradingsymbol+i} style={{borderBottom:`1px solid ${T.border}20`,background:i%2===0?"transparent":T.bg+"50"}}>
                <td style={{padding:"10px 12px"}}><div style={{fontWeight:800,color:T.text}}>{p.tradingsymbol}</div><div style={{fontSize:9,color:T.textDim}}>{p.exchange} • {p.quantity>0?"LONG":"SHORT"}</div></td>
                <td style={{padding:"10px 12px"}}><Badge label={p.product} color={T.cyan} bg={T.cyanBg}/></td>
                <td style={{padding:"10px 12px",color:p.quantity>0?T.green:T.red,fontWeight:700}}>{p.quantity}</td>
                <td style={{padding:"10px 12px",color:T.textMid}}>₹{p.average_price?.toFixed(2)}</td>
                <td style={{padding:"10px 12px",fontWeight:700,color:T.text}}>₹{p.last_price?.toFixed(2)||"—"}</td>
                <td style={{padding:"10px 12px",fontWeight:700,color:(p.pnl||0)>=0?T.green:T.red}}>{fmt(p.pnl||0)}</td>
                <td style={{padding:"10px 12px",color:(p.day_change_percentage||0)>=0?T.green:T.red}}>{(p.day_change_percentage||0)>=0?"+":""}{(p.day_change_percentage||0).toFixed(2)}%</td>
                <td style={{padding:"10px 12px",color:T.textMid}}>{fmtN(Math.abs(p.quantity)*(p.last_price||p.average_price))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function HoldingsView({T}){
  const [data,setData]=useState([]);const[loading,setLoading]=useState(true);
  useEffect(()=>{fetch(`${API}/api/holdings`).then(r=>r.json()).then(d=>setData(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false));},[]);
  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}><div style={{width:28,height:28,border:`3px solid ${T.border}`,borderTop:`3px solid ${T.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
  const inv=data.reduce((s,h)=>s+h.average_price*h.quantity,0);
  const cur=data.reduce((s,h)=>s+(h.last_price||h.average_price)*h.quantity,0);
  const totalPnL=cur-inv;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        <KPI T={T} icon="💼" label="Total Invested" value={fmtN(inv)} color={T.accent}/>
        <KPI T={T} icon="📈" label="Current Value" value={fmtN(cur)} color={T.text}/>
        <KPI T={T} icon="💰" label="Total P&L" value={fmt(totalPnL)} sub={inv>0?`${((totalPnL/inv)*100).toFixed(2)}% return`:""} color={totalPnL>=0?T.green:T.red}/>
      </div>
      {data.length===0?<div style={{padding:48,textAlign:"center",color:T.textDim,fontSize:12}}>No holdings in Zerodha account.</div>:(
        <Card T={T} noPad>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:T.bg}}>{["Symbol","Qty","Avg Buy","LTP","Invested","Current","P&L","P&L%","Day Chg"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:9,color:T.textMid,fontWeight:700,borderBottom:`1px solid ${T.border}`,letterSpacing:0.8}}>{h}</th>)}</tr></thead>
              <tbody>{data.map((h,i)=>{const invested=h.average_price*h.quantity,current=(h.last_price||h.average_price)*h.quantity,pl=current-invested,plP=((pl/invested)*100).toFixed(2);
                return <tr key={h.tradingsymbol} style={{borderBottom:`1px solid ${T.border}20`,background:i%2===0?"transparent":T.bg+"50"}}>
                  <td style={{padding:"10px 12px"}}><div style={{fontWeight:800,color:T.text}}>{h.tradingsymbol}</div><div style={{fontSize:9,color:T.textDim}}>{h.exchange}</div></td>
                  <td style={{padding:"10px 12px",color:T.textMid}}>{h.quantity}</td>
                  <td style={{padding:"10px 12px",color:T.textMid}}>₹{h.average_price?.toFixed(2)}</td>
                  <td style={{padding:"10px 12px",fontWeight:700,color:T.text}}>₹{h.last_price?.toFixed(2)||"—"}</td>
                  <td style={{padding:"10px 12px",color:T.textMid}}>{fmtN(invested)}</td>
                  <td style={{padding:"10px 12px",color:T.text}}>{fmtN(current)}</td>
                  <td style={{padding:"10px 12px",fontWeight:700,color:pl>=0?T.green:T.red}}>{fmt(pl)}</td>
                  <td style={{padding:"10px 12px",color:pl>=0?T.green:T.red}}>{plP}%</td>
                  <td style={{padding:"10px 12px",color:(h.day_change_percentage||0)>=0?T.green:T.red}}>{(h.day_change_percentage||0)>=0?"+":""}{(h.day_change_percentage||0).toFixed(2)}%</td>
                </tr>;})}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function MarginsView({T}){
  const [data,setData]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{fetch(`${API}/api/margins`).then(r=>r.json()).then(d=>setData(d)).catch(()=>{}).finally(()=>setLoading(false));},[]);
  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60}}><div style={{width:28,height:28,border:`3px solid ${T.border}`,borderTop:`3px solid ${T.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
  if(!data) return <div style={{padding:40,textAlign:"center",color:T.textDim}}>Could not load margin data.</div>;
  const eq=data.equity||{};const co=data.commodity||{};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        <KPI T={T} icon="💵" label="Available Cash" value={fmtN(eq.available?.cash||0)} color={T.green}/>
        <KPI T={T} icon="📉" label="Used Margin" value={fmtN(eq.utilised?.debits||0)} color={T.red}/>
        <KPI T={T} icon="🏦" label="Total Balance" value={fmtN(eq.net||0)} color={T.accent}/>
        <KPI T={T} icon="📂" label="Opening Balance" value={fmtN(eq.available?.opening_balance||0)} color={T.text}/>
        <KPI T={T} icon="🛢️" label="Commodity Cash" value={fmtN(co.available?.cash||0)} color={T.yellow}/>
        <KPI T={T} icon="📥" label="Live Balance" value={fmtN(eq.available?.live_balance||0)} color={T.purple}/>
      </div>
      <Card T={T} title="Equity Segment — Full Breakup" accent={T.accent}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:T.green,marginBottom:10,letterSpacing:1}}>AVAILABLE</div>
            {Object.entries(eq.available||{}).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,fontSize:11}}>
                <span style={{color:T.textMid,textTransform:"capitalize"}}>{k.replace(/_/g," ")}</span>
                <span style={{fontWeight:700,color:T.green}}>{fmtN(v)}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:T.red,marginBottom:10,letterSpacing:1}}>UTILISED</div>
            {Object.entries(eq.utilised||{}).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}20`,fontSize:11}}>
                <span style={{color:T.textMid,textTransform:"capitalize"}}>{k.replace(/_/g," ")}</span>
                <span style={{fontWeight:700,color:v>0?T.red:T.textDim}}>{fmtN(v)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
