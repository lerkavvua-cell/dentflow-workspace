'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db, firebaseReady } from '@/lib/firebase';
import { copy } from '@/lib/i18n';
import type { Lang, Message, Patient, PatientStatus, Presence, Profile, UserKey, WorkspaceKey } from '@/types';

const users: Profile[] = [
  { key: 'valeriia', name: 'Valeriia', role: 'Owner' },
  { key: 'behnia', name: 'Behnia', role: 'Planner' },
  { key: 'ilayda', name: 'İlayda', role: 'Planner' },
  { key: 'manager', name: 'Manager', role: 'Manager' }
];
const workspaces: WorkspaceKey[] = ['valeriia', 'behnia', 'ilayda'];
const statusLabels: Record<PatientStatus, string> = { review: '🟡 Review', correction: '🟠 Correction', approved: '🟢 Approved', sent: '🔵 Sent', archived: '📦 Archived' };
const presenceLabels: Record<Presence, string> = { here: '🟢', break: '☕', lunch: '🍽️', busy: '📞', finished: '🌙' };
const localKey = 'dentflow-cloud-v02-local';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => Date.now();
const fmt = (n:number) => new Date(n).toLocaleString([], { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });

function loadLocal(){
  if(typeof window==='undefined') return null;
  try { return JSON.parse(localStorage.getItem(localKey) || 'null'); } catch { return null; }
}
function saveLocal(data:any){ if(typeof window!=='undefined') localStorage.setItem(localKey, JSON.stringify(data)); }

export default function Page(){
  const [user, setUser] = useState<UserKey | null>(null);
  const [lang, setLang] = useState<Lang>('ru');
  const [theme, setTheme] = useState('paper');
  const [presence, setPresence] = useState<Record<UserKey, Presence>>({valeriia:'here', behnia:'here', ilayda:'here', manager:'here'});
  const [messages, setMessages] = useState<Message[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState('');
  const [emergency, setEmergency] = useState<string>('');
  const [toast, setToast] = useState<string>('');
  const t = copy[lang];

  useEffect(()=>{ document.documentElement.dataset.theme = theme; },[theme]);

  // Realtime Firebase, fallback to localStorage if env config is absent.
  useEffect(()=>{
    if(!user) return;
    if(firebaseReady && db){
      const unsubM = onSnapshot(query(collection(db,'messages'), orderBy('createdAt','asc')), snap => {
        setMessages(snap.docs.map(d=>({id:d.id, ...d.data()} as Message)));
      });
      const unsubP = onSnapshot(query(collection(db,'patients'), orderBy('updatedAt','desc')), snap => {
        setPatients(snap.docs.map(d=>({id:d.id, ...d.data()} as Patient)));
      });
      const unsubPr = onSnapshot(collection(db,'presence'), snap => {
        const next:any = {valeriia:'finished', behnia:'finished', ilayda:'finished', manager:'finished'};
        snap.docs.forEach(d=> next[d.id]=d.data().status);
        setPresence(next);
      });
      const unsubE = onSnapshot(doc(db,'system','emergency'), snap => setEmergency((snap.data()?.text as string)||''));
      return ()=>{unsubM();unsubP();unsubPr();unsubE();};
    } else {
      const data = loadLocal() || seedData();
      setMessages(data.messages); setPatients(data.patients); setPresence(data.presence); setEmergency(data.emergency||'');
      const timer = setInterval(()=>{
        const d=loadLocal(); if(d){ setMessages(d.messages); setPatients(d.patients); setPresence(d.presence); setEmergency(d.emergency||''); }
      },800);
      return ()=>clearInterval(timer);
    }
  },[user]);

  useEffect(()=>{ if(!firebaseReady && user){ saveLocal({messages,patients,presence,emergency}); } },[messages,patients,presence,emergency,user]);

  async function setMyPresence(status: Presence){
    if(!user) return;
    const next = {...presence, [user]: status}; setPresence(next);
    if(firebaseReady && db) await setDoc(doc(db,'presence',user), {status, updatedAt: now()}, {merge:true});
    const phrase = status==='here'?'started working':status==='finished'?'finished today':`status: ${status}`;
    await sendSystem(`${users.find(u=>u.key===user)?.name} ${phrase}.`, user==='manager'?'valeriia':(user as WorkspaceKey));
  }
  async function sendSystem(text:string, workspace:WorkspaceKey){
    const msg: Message = { id: uid(), workspace, author:'manager', text, createdAt: now() };
    if(firebaseReady && db) await addDoc(collection(db,'messages'), msg); else setMessages(m=>[...m,msg]);
  }
  async function sendMessage(workspace:WorkspaceKey, data:{text:string; patient?:string; cardLink?:string; canvaLink?:string}){
    if(!user || !data.text.trim()) return;
    const msg: Message = { id: uid(), workspace, author:user, text:data.text.trim(), patient:data.patient?.trim()||'', cardLink:data.cardLink?.trim()||'', canvaLink:data.canvaLink?.trim()||'', createdAt: now() };
    if(firebaseReady && db) await addDoc(collection(db,'messages'), msg); else setMessages(m=>[...m,msg]);
    if(data.patient?.trim()){
      const p: Patient = { id: uid(), workspace, name:data.patient.trim(), status:'review', cardLink:data.cardLink?.trim()||'', canvaLink:data.canvaLink?.trim()||'', createdAt:now(), updatedAt:now() };
      if(firebaseReady && db) await addDoc(collection(db,'patients'), p); else setPatients(pats=>[p,...pats]);
    }
    if(data.text.includes('@')){ setToast('🌸 Mention notification'); setTimeout(()=>setToast(''),3000); }
  }
  async function changePatient(id:string,status:PatientStatus){
    if(firebaseReady && db) await updateDoc(doc(db,'patients',id), {status, updatedAt:now()});
    setPatients(p=>p.map(x=>x.id===id?{...x,status,updatedAt:now()}:x));
  }
  async function sendEmergency(text:string){
    setEmergency(text);
    if(firebaseReady && db) await setDoc(doc(db,'system','emergency'), {text, updatedAt:now()});
  }
  async function clearEmergency(){
    setEmergency('');
    if(firebaseReady && db) await setDoc(doc(db,'system','emergency'), {text:'', updatedAt:now()});
  }

  const filtered = useMemo(()=>{
    const s=q.toLowerCase().trim(); if(!s) return {messages,patients};
    return {
      messages: messages.filter(m=>[m.text,m.patient,m.cardLink,m.canvaLink,m.author,m.workspace].join(' ').toLowerCase().includes(s)),
      patients: patients.filter(p=>[p.name,p.agent,p.status,p.workspace,p.cardLink,p.canvaLink].join(' ').toLowerCase().includes(s))
    };
  },[q,messages,patients]);

  if(!user) return <Login lang={lang} setLang={setLang} setUser={setUser} theme={theme} setTheme={setTheme}/>;
  const profile = users.find(u=>u.key===user)!;

  return <div className="app">
    <div className="topbar">
      <div className="brand"><div className="logo">☁️</div><div><h1>DentFlow HQ</h1><p>{profile.name} • {profile.role} • {firebaseReady?'Cloud':'Local demo'}</p></div></div>
      <div className="search"><span>🔎</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t.search}/></div>
      <div className="toolbar">
        <select className="pill" value={presence[user]} onChange={e=>setMyPresence(e.target.value as Presence)}>
          <option value="here">🟢 {t.here}</option><option value="break">☕ {t.break}</option><option value="lunch">🍽️ {t.lunch}</option><option value="busy">📞 {t.busy}</option><option value="finished">🌙 {t.finished}</option>
        </select>
        <select className="pill" value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="ru">RU</option><option value="en">EN</option><option value="tr">TR</option><option value="fa">FA</option></select>
        <select className="pill" value={theme} onChange={e=>setTheme(e.target.value)}><option value="paper">Paper</option><option value="forest">Forest</option><option value="ocean">Ocean</option><option value="sakura">Sakura</option><option value="night">Night</option></select>
        <button className="toolbtn" onClick={()=>setUser(null)}>Exit</button>
      </div>
    </div>
    <main className="main">
      {workspaces.map(ws => <ChatColumn key={ws} workspace={ws} currentUser={user} messages={filtered.messages.filter(m=>m.workspace===ws)} patients={filtered.patients.filter(p=>p.workspace===ws)} presence={presence[ws]} onSend={sendMessage} onStatus={changePatient} />)}
      <OwnerSide t={t} user={user} patients={patients} messages={messages} onEmergency={sendEmergency} lang={lang}/>
    </main>
    {emergency && <div className="alert"><div className="alertbox"><h2>🚨 IMPORTANT</h2><p>{emergency}</p><button onClick={clearEmergency}>I have read it</button></div></div>}
    {toast && <div className="toast"><span className="emoji">🌸</span>{toast}</div>}
  </div>;
}

function Login({lang,setLang,setUser,theme,setTheme}:{lang:Lang;setLang:(l:Lang)=>void;setUser:(u:UserKey)=>void;theme:string;setTheme:(s:string)=>void}){
  const t=copy[lang]; const [scene,setScene]=useState(0);
  useEffect(()=>{setScene(Math.floor(Math.random()*3));},[]);
  return <div className="login" data-theme={theme}>
    <div className="welcome">
      <div className="scene">
        {scene===0 && <><div className="sun"></div><div className="cloud"></div><div className="cloud c2"></div></>}
        {scene===1 && <><div className="balloon b1">🎈</div><div className="balloon b2">🎈</div><div className="sun"> </div></>}
        {scene===2 && <><div style={{fontSize:82, paddingTop:20}}>🐶</div><div className="cloud c2"></div></>}
      </div>
      <h1>{t.welcome} ☀️</h1><p>{t.subtitle}</p>
      <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:14}}><select className="pill" value={lang} onChange={e=>setLang(e.target.value as Lang)}><option value="ru">Русский</option><option value="en">English</option><option value="tr">Türkçe</option><option value="fa">فارسی</option></select><select className="pill" value={theme} onChange={e=>setTheme(e.target.value)}><option value="paper">Paper</option><option value="forest">Forest</option><option value="ocean">Ocean</option><option value="sakura">Sakura</option><option value="night">Night</option></select></div>
      <div className="login-actions">
        <button onClick={()=>setUser('valeriia')}>👑 Valeriia</button><button onClick={()=>setUser('manager')}>🛡 Manager</button><button onClick={()=>setUser('behnia')}>Behnia</button><button onClick={()=>setUser('ilayda')}>İlayda</button>
      </div>
    </div>
  </div>
}

function ChatColumn({workspace,currentUser,messages,patients,presence,onSend,onStatus}:{workspace:WorkspaceKey;currentUser:UserKey;messages:Message[];patients:Patient[];presence:Presence;onSend:(w:WorkspaceKey,d:any)=>void;onStatus:(id:string,s:PatientStatus)=>void}){
  const [text,setText]=useState(''); const [patient,setPatient]=useState(''); const [card,setCard]=useState(''); const [canva,setCanva]=useState('');
  const bodyRef=useRef<HTMLDivElement>(null); useEffect(()=>{bodyRef.current?.scrollTo({top:bodyRef.current.scrollHeight});},[messages.length]);
  const person = users.find(u=>u.key===workspace)!; const isMine=currentUser===workspace || (currentUser==='valeriia'&&workspace==='valeriia');
  const statusClass = presence==='break'||presence==='lunch'?'break':presence==='busy'?'busy':presence==='finished'?'off':'';
  function submit(){ onSend(workspace,{text, patient, cardLink:card, canvaLink:canva}); setText(''); setPatient(''); setCard(''); setCanva(''); }
  return <section className={`chatcol ${isMine?'me':''}`}>
    <div className="chathead"><div className="userline"><div className="userbox"><div className="avatar">{person.name[0]}</div><div><h2>{person.name}</h2><div className="status"><span className={`statusdot ${statusClass}`}></span>{presenceLabels[presence]} {presence}</div></div></div><div className="headbtns"><button className="mini">🔍</button><button className="mini">📌</button></div></div>
      <div className="patients">{patients.slice(0,8).map(p=><button key={p.id} className={`patientchip ${p.status==='approved'?'approved':p.status==='sent'?'sent':'review'}`} onClick={()=>onStatus(p.id, p.status==='review'?'approved':p.status==='approved'?'sent':'review')}>{p.name} • {statusLabels[p.status]}</button>)}</div>
    </div>
    <div className="messages" ref={bodyRef}>{messages.map(m=><div key={m.id} className={`msg ${m.author===currentUser?'mine':''}`}><div className="bubble"><div className="meta">{users.find(u=>u.key===m.author)?.name} • {fmt(m.createdAt)} {m.patient?`• ${m.patient}`:''}</div><div className="text">{m.text}</div>{(m.cardLink||m.canvaLink)&&<div className="links">{m.cardLink&&<a className="linkbtn" href={m.cardLink} target="_blank">📄 Card</a>}{m.canvaLink&&<a className="linkbtn" href={m.canvaLink} target="_blank">🎨 Canva</a>}</div>}</div></div>)}</div>
    <div className="composer"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Message... Use @Valeriia / @Behnia / @İlayda" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}}}/><div className="compose-row"><input value={patient} onChange={e=>setPatient(e.target.value)} placeholder="Patient"/><input value={card} onChange={e=>setCard(e.target.value)} placeholder="Card"/><input value={canva} onChange={e=>setCanva(e.target.value)} placeholder="Canva"/><button className="send" onClick={submit}>Send</button></div></div>
  </section>
}

function OwnerSide({t,user,patients,messages,onEmergency,lang}:{t:any;user:UserKey;patients:Patient[];messages:Message[];onEmergency:(s:string)=>void;lang:Lang}){
  const [em,setEm]=useState(''); const today = new Date().toISOString().slice(0,10);
  const createdToday=patients.filter(p=>new Date(p.createdAt).toISOString().slice(0,10)===today);
  const approved=patients.filter(p=>p.status==='approved').length; const sent=patients.filter(p=>p.status==='sent').length; const waiting=patients.filter(p=>p.status==='review'||p.status==='correction').length;
  function download(name:string, text:string, type='text/plain') { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
  function report(){ const rows=[['Metric','Value'],['Created today',createdToday.length],['Approved',approved],['Sent',sent],['Waiting',waiting],[],['Patients'],...patients.map(p=>[p.name,p.workspace,p.status,new Date(p.createdAt).toLocaleString()])]; download(`DentFlow_Daily_Report_${today}.csv`, rows.map(r=>r.join(',')).join('\n'), 'text/csv'); }
  function backup(){ download(`DentFlow_Backup_${today}.json`, JSON.stringify({patients,messages,exportedAt:new Date().toISOString()},null,2), 'application/json'); }
  return <aside className="side owner"><div className="card"><h3>🌱 {t.tree}</h3><div style={{fontSize:54,textAlign:'center'}}>{sent>20?'🌳':sent>8?'🌿':'🌱'}</div><p className="muted">Team workspace grows together. No ratings.</p></div><div className="card"><h3>{t.today}</h3><div className="grid2"><div><div className="statnum">{createdToday.length}</div><div className="muted">{t.created}</div></div><div><div className="statnum">{waiting}</div><div className="muted">{t.waiting}</div></div><div><div className="statnum">{approved}</div><div className="muted">{t.approved}</div></div><div><div className="statnum">{sent}</div><div className="muted">{t.sent}</div></div></div></div>{user==='valeriia'&&<><div className="card"><h3>👑 {t.owner}</h3><button onClick={report}>📊 Download CSV Report</button><button onClick={backup}>💾 Backup JSON</button><button onClick={()=>download('DentFlow_Invite.txt','Open the DentFlow workspace link and choose your assigned role. In production this will be replaced by email invite tokens.')}>🔗 Create Invite Note</button></div><div className="card"><h3>🚨 {t.emergency}</h3><input className="smallinput" value={em} onChange={e=>setEm(e.target.value)} placeholder="Important message for all"/><button onClick={()=>{onEmergency(em);setEm('')}}>Send Emergency</button></div></>}<div className="card"><h3>📌 Roadmap</h3><p className="muted">v0.2 Cloud-ready MVP: 3 chats, presence, patients, search, reports, backup. Next: Firebase auth + secure invite links.</p></div></aside>
}

function seedData(){
  const patients:Patient[]=[{id:uid(),workspace:'valeriia',name:'Amit Rozeman',status:'review',cardLink:'',canvaLink:'',createdAt:now()-4500000,updatedAt:now()-4500000},{id:uid(),workspace:'behnia',name:'Sarah Levi',status:'approved',createdAt:now()-3000000,updatedAt:now()-3000000},{id:uid(),workspace:'ilayda',name:'David Cohen',status:'sent',createdAt:now()-2000000,updatedAt:now()-2000000} as any];
  const messages:Message[]=[{id:uid(),workspace:'valeriia',author:'valeriia',text:'New patient. Please check the plan.',patient:'Amit Rozeman',createdAt:now()-4300000},{id:uid(),workspace:'valeriia',author:'manager',text:'Please correct tooth 36 and send again. @Valeriia',patient:'Amit Rozeman',createdAt:now()-4100000},{id:uid(),workspace:'behnia',author:'behnia',text:'Plan sent for control.',patient:'Sarah Levi',createdAt:now()-3000000},{id:uid(),workspace:'ilayda',author:'manager',text:'Approved ✅',patient:'David Cohen',createdAt:now()-1900000}];
  return {patients,messages,presence:{valeriia:'here',behnia:'here',ilayda:'break',manager:'here'},emergency:''};
}
