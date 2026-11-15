import React, { useMemo, useRef, useState } from 'react';
import { LayoutGrid, MailSearch, MailCheck, Wand2, Globe, Send, FileCode } from 'lucide-react';
import { AdSenseUnit } from './components/AdSenseUnit';
import { DomainExtractor } from './components/DomainExtractor';
import { EmailExtractor } from './components/EmailExtractor';
import { EmailFormatter } from './components/EmailFormatter';
import { EmailSender } from './components/EmailSender';
import { EmailValidator } from './components/EmailValidator';
import { HtmlTemplateBuilder } from './components/HtmlTemplateBuilder';
import { extractDomainsFromEmails } from './utils/emailTools';

type EmailSection = 'extractor' | 'validator' | 'formatter' | 'domains' | 'sender' | 'templates';
const links: {id:EmailSection;label:string;Icon:React.ElementType}[]=[
{id:'extractor',label:'Extract',Icon:MailSearch},{id:'validator',label:'Validate',Icon:MailCheck},{id:'formatter',label:'Format',Icon:Wand2},{id:'domains',label:'Domains',Icon:Globe},{id:'sender',label:'Bulk Sender',Icon:Send},{id:'templates',label:'Email Templates',Icon:FileCode}];

export default function EmailToolsScreen(){
 const [section,setSection]=useState<EmailSection>('extractor');
 const [emails,setEmails]=useState<string[]>([]);
 const [formattedCount,setFormattedCount]=useState(0);
 const [singleRequest,setSingleRequest]=useState<{email:string;triggerId:number}|null>(null);
 const [bulkRequest,setBulkRequest]=useState<{emails:string[];triggerId:number}|null>(null);
 const validatorRef=useRef<HTMLDivElement>(null);
 const domains=useMemo(()=>extractDomainsFromEmails(emails).length,[emails]);
 const show=(s:EmailSection)=>section===s;
 const jumpValidator=(email?:string,all?:string[])=>{
  if(email)setSingleRequest({email,triggerId:Date.now()});
  if(all?.length)setBulkRequest({emails:all,triggerId:Date.now()});
  setSection('validator');
  window.setTimeout(()=>validatorRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),50);
 };
 return <div className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-10 sm:px-6">
  <section className="rounded-2xl border border-white/10 bg-[#0c111b] p-4 sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#7CFF00]">M2A DIGITAL TOOLS</p><h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Email Extraction & Campaign Suite</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Extract, clean, validate, organize, design and send email campaigns with your own SMTP or email API.</p></div><div className="flex gap-4 text-xs text-slate-400"><span><b className="block text-lg text-white">{emails.length}</b>Emails</span><span><b className="block text-lg text-white">{domains}</b>Domains</span><span><b className="block text-lg text-white">{formattedCount}</b>Formatted</span></div></div>
   <div className="mt-4"><AdSenseUnit/></div>
   <nav aria-label="Email tools" className="mt-4 flex gap-2 overflow-x-auto pb-1">{links.map(({id,label,Icon})=><button key={id} onClick={()=>setSection(id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${section===id?'bg-[#7CFF00] text-black':'bg-white/[.06] text-slate-300 hover:bg-white/10'}`}><Icon className="h-4 w-4"/>{label}</button>)}</nav>
  </section>
  <div className="space-y-6">
   <div hidden={!show('extractor')}><EmailExtractor onValidateEmail={(e)=>jumpValidator(e)} onValidateAll={(e)=>jumpValidator(undefined,e)} onExtractedChange={setEmails}/></div>
   <div ref={validatorRef} hidden={!show('validator')}><EmailValidator externalEmailRequest={singleRequest} externalBulkRequest={bulkRequest} extractedEmails={emails}/></div>
   <div hidden={!show('formatter')}><EmailFormatter extractedEmails={emails} onFormattedCountChange={setFormattedCount}/></div>
   <div hidden={!show('domains')}><DomainExtractor extractedEmails={emails} onNavigate={()=>setSection('validator')}/></div>
   <div hidden={!show('sender')}><EmailSender extractedEmails={emails}/></div>
   <div hidden={!show('templates')}><HtmlTemplateBuilder/></div>
  </div>
 </div>;
}