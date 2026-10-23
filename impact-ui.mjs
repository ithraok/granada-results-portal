import {impactRows,summarize,ranking,groups,recommendation,impactMetrics,rating,changeBand} from './impact-model.mjs';
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const number=v=>typeof v==='number'&&Number.isFinite(v)?new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(v):'غير متاح';
const gradeName=g=>({4:'الرابع',5:'الخامس',6:'السادس'}[g]||g);
const className=r=>`${gradeName(r.grade)} / ${r.section}`;
function select(label,options,value){const wrap=el('label',label),s=el('select');for(const [v,t]of options){const o=el('option',t);o.value=v;s.append(o);}s.value=value;wrap.append(s);return [wrap,s];}
function table(headers,rows){
 const box=el('div',undefined,'impact-table-wrap');box.tabIndex=0;box.setAttribute('aria-label','جدول النتائج — يمكن تمريره أفقيًا');
 const t=el('table'),head=el('thead'),tr=el('tr');for(const h of headers){const th=el('th',h);th.scope='col';tr.append(th);}head.append(tr);t.append(head);
 const body=el('tbody');for(const cells of rows){const r=el('tr');for(const cell of cells){const td=el('td');if(cell instanceof Node)td.append(cell);else td.textContent=String(cell??'غير متاح');r.append(td);}body.append(r);}t.append(body);box.append(t);if(!rows.length)box.append(el('p','لا تتوفر بيانات مرصودة لهذا الاختيار.','impact-empty'));return box;
}
function movement(delta){const n=el('span',delta===null?'غير متاح':`${delta>0?'↑ +':delta<0?'↓ ': '↔ '}${number(delta)} نقطة`,delta>0?'impact-up':delta<0?'impact-down':'impact-flat');return n;}
function chart(title,rows,valueLabel='متوسط الدرجة من 100',maximum=100){
 const box=el('section',undefined,'impact-chart');box.append(el('h3',title),el('p',valueLabel,'impact-muted'));
 for(const row of rows){const item=el('div',undefined,'impact-chart-row'),heading=el('div',undefined,'impact-chart-label');heading.append(el('span',row.label),el('b',row.value===null?'غير متاح':number(row.value)));const track=el('div',undefined,'impact-track'),bar=el('div',undefined,'impact-bar');bar.style.width=`${Math.max(0,Math.min(100,(row.value??0)/maximum*100))}%`;track.setAttribute('role','img');track.setAttribute('aria-label',`${row.label}: ${number(row.value)} ${valueLabel}`);track.append(bar);item.append(heading,track);box.append(item);}return box;
}
function metric(label,value,tone=''){const n=el('div',undefined,'impact-metric '+tone);n.append(el('span',label),el('strong',number(value)));return n;}
export function mountImpact({root,report,load,onSessionError}){
 if(!document.querySelector('link[data-impact-style]')){const link=el('link');link.rel='stylesheet';link.href='/impact.css';link.dataset.impactStyle='true';document.head.append(link);}
 const entry=el('button','◈ تتبّع الأثر','impact-entry');entry.type='button';entry.id='gr-impact';report.querySelector('.actions').append(entry);
 const panel=el('section',undefined,'impact-panel');panel.hidden=true;panel.setAttribute('aria-label','تتبّع الأثر — عرض المعلم التجريبي');root.append(panel);
 let data=null,disposed=false,view='overview',term='1',period='1',scope='all',metricKey='score',requestNumber=0;
 const sections=[['overview','الإحصائية العامة'],['classes','مقارنة الفصول'],['top','العشرة الأوائل'],['support','أولوية الدعم'],['grades','مقارنة الصفوف'],['training','قياس الأثر'],['recommendations','ملخص التوصيات']];
 const back=()=>{panel.hidden=true;report.hidden=false;entry.focus();};
 function render(){
  panel.replaceChildren();const actions=el('div',undefined,'impact-actions');const close=el('button','العودة إلى التقرير'),print=el('button','طباعة الملخص');close.type=print.type='button';close.addEventListener('click',back);print.addEventListener('click',()=>window.print());actions.append(close,print);panel.append(actions);
  const title=el('h2','تتبّع الأثر');title.tabIndex=-1;panel.append(title,el('p','لوحة المعلم — مادة المهارات الرقمية','impact-subtitle'),el('p',data.title,'impact-demo-banner'));
  const filters=el('div',undefined,'impact-filters');
  const [tl,ts]=select('عرض النتائج',[['1','الفصل الدراسي الأول'],['2','الفصل الدراسي الثاني'],['year','النتيجة النهائية للعام الدراسي']],term);
  const [pl,ps]=select('الفترة',[['1','الفترة الأولى'],['2','الفترة الثانية'],['final','نهاية الفصل']],period);ps.disabled=term==='year';
  const opts=[['all','جميع الفصول'],... [4,5,6].flatMap(g=>[[`g${g}`,`الصف ${gradeName(g)} كاملًا`],...[1,2].map(s=>[`c${g}-${s}`,`${gradeName(g)} — الفصل ${s}`])])];
  const [sl,ss]=select('نطاق المقارنة',opts,scope);const [ml,ms]=select('مؤشر التتبع',Object.entries(impactMetrics).map(([k,m])=>[k,`${m.label} — من ${m.max}`]),metricKey);filters.append(tl,pl,sl,ml);panel.append(filters);
  ms.id='impact-metric';ms.addEventListener('change',()=>{metricKey=ms.value;render();panel.querySelector('#impact-metric').focus();});ts.id='impact-term';ps.id='impact-period';ss.id='impact-scope';
  ts.addEventListener('change',()=>{term=ts.value;render();panel.querySelector('#impact-term').focus();});ps.addEventListener('change',()=>{period=ps.value;render();panel.querySelector('#impact-period').focus();});ss.addEventListener('change',()=>{scope=ss.value;render();panel.querySelector('#impact-scope').focus();});
  panel.append(el('p',`${opts.find(o=>o[0]===scope)[1]} — ${ts.selectedOptions[0].textContent}${term==='year'?'':' — '+ps.selectedOptions[0].textContent}`,'impact-context'));panel.append(el('p',`المؤشر: ${impactMetrics[metricKey].label} — من ${impactMetrics[metricKey].max}؛ التقدير العام بحسب المجموع من100.`,'impact-context'));
  const nav=el('nav',undefined,'impact-nav');nav.setAttribute('aria-label','تقارير تتبع الأثر');for(const [key,label]of sections){const b=el('button',label);b.type='button';b.setAttribute('aria-pressed',String(view===key));b.addEventListener('click',()=>{view=key;render();panel.querySelector('.impact-content h3')?.focus();});nav.append(b);}panel.append(nav);
  const content=el('div',undefined,'impact-content'),h=el('h3',sections.find(s=>s[0]===view)[1]);h.tabIndex=-1;content.append(h);panel.append(content);
  const rows=impactRows(data.students,term,period,scope,metricKey),summary=summarize(rows,metricKey),selected=impactMetrics[metricKey];
  const sorted=ranking(rows,false,metricKey),classGroups=groups(rows,'class',metricKey),gradeGroups=groups(rows,'grade',metricKey);const scoreCells=r=>[number(r.tasks),number(r.assessment),number(r.score),rating(r.score)];const comparisonTitle=term==='year'?'تغير الفصلين':'تغير الفترتين';const comparisonChart=(title,rows)=>chart(title,rows,`${selected.label} — من ${selected.max}`,selected.max);
  const appendRank=(list,title,tone)=>{const section=el('section',undefined,'impact-ranking '+tone);section.append(el('h4',title),table(['الترتيب','الطالب','الصف / الفصل','درجة40','درجة60','المجموع /100','التقدير العام',comparisonTitle+' — '+selected.label,'التوصية المقترحة'],list.slice(0,10).map((r,i)=>[i+1,r.name,className(r),...scoreCells(r),movement(r.delta),recommendation(r)])));content.append(section);};
  const cards=el('div',undefined,'impact-metrics');cards.append(metric('الطلاب في النطاق',summary.registered),metric('لديهم نتيجة مرصودة',summary.recorded),metric('متوسط درجة40',summary.means.tasks),metric('متوسط درجة60',summary.means.assessment),metric('متوسط المجموع /100',summary.means.score),metric('ممتاز — 90 فأعلى',summary.excellent,'positive'),metric('أقل من 70 — يحتاج متابعة',summary.support,'support'),metric('نتائج غير مكتملة',summary.missing));
  if(view==='overview'){
   content.append(cards,comparisonChart('مقارنة متوسطات الفصول',classGroups.map(g=>({label:g.label,value:g.mean}))),comparisonChart('مقارنة متوسطات الصفوف',gradeGroups.map(g=>({label:g.label,value:g.mean}))));
   content.append(el('p',`أفضل فصل في النطاق بحسب متوسط الدرجات المرصودة: ${classGroups.find(g=>g.recorded)?.label||'غير متاح'}. عدد من لديهم نتيجتان للمقارنة: ${summary.paired}.`,'impact-explanation'));
  }
  if(view==='classes'||view==='grades'){
   const grouped=view==='classes'?classGroups:gradeGroups;
   content.append(comparisonChart('الترتيب بحسب متوسط المؤشر المختار',grouped.map(g=>({label:g.label,value:g.mean}))),table(['النطاق','الطلاب','المرصود','متوسط40','متوسط60','المجموع /100','ممتاز','أقل من70','نتيجتان للمقارنة','متوسط تغير المؤشر'],grouped.map(g=>[g.label,g.registered,g.recorded,number(g.means.tasks),number(g.means.assessment),number(g.means.score),g.excellent,g.support,g.paired,movement(g.delta)])));
   if(view==='grades')for(const group of grouped){const r=rows.filter(r=>String(r.grade)===group.key);appendRank(ranking(r,false,metricKey),`العشرة الأوائل — ${group.label}`,'positive');appendRank(ranking(r,true,metricKey),`العشرة الأكثر احتياجًا للمتابعة — ${group.label}`,'support');}
  }
  if(view==='top'||view==='support'){
   const asc=view==='support';content.append(el('p',asc?'الترتيب حسب المؤشر المختار من الأقل إلى الأعلى؛ وجود الطالب هنا لا يعني بالضرورة أن تقديره ضعيف.':'الترتيب حسب المؤشر المختار من الأعلى إلى الأقل. المتعادلون يحملون الدرجة نفسها، ويُحسم ترتيب العرض بالمرجع التجريبي.','impact-explanation'));
   appendRank(asc?ranking(rows,true,metricKey):sorted,scope==='all'?'جميع الفصول':opts.find(o=>o[0]===scope)[1],asc?'support':'positive');
   if(scope==='all'||scope.startsWith('g'))for(const group of classGroups){const r=rows.filter(r=>`${r.grade}-${r.section}`===group.key);appendRank(ranking(r,asc,metricKey),group.label,asc?'support':'positive');}
  }
  if(view==='recommendations'){
   content.append(cards,el('p','مقترحات للمعلم يمكن مراجعتها قبل مشاركتها مع ولي الأمر؛ لا تُرسل تلقائيًا.','impact-explanation'));
   const bands=[[0,50,'خطة دعم مكثفة'],[50,70,'دعم ومتابعة'],[70,80,'تعزيز المهارات'],[80,90,'إتقان التفاصيل'],[90,101,'إثراء وتميز']];
   for(const [min,max,label]of bands){const band=ranking(rows,true,'score').filter(r=>r.score>=min&&r.score<max),details=el('details',undefined,'impact-recommendation');details.append(el('summary',`${label} — ${band.length} طالبًا`),table(['الطالب','الفصل','درجة40','درجة60','المجموع /100','التقدير العام','التوصية المقترحة'],band.map(r=>[r.name,className(r),...scoreCells(r),recommendation(r)])));content.append(details);}
  }
  if(view==='training'){
   const paired=rows.filter(r=>r.delta!==null),beforeLabel=term==='year'?'الفصل الدراسي الأول':'الفترة الأولى',afterLabel=term==='year'?'الفصل الدراسي الثاني':'الفترة الثانية';
   content.append(el('p',`تتبّع ${selected.label} من ${selected.max}: ${beforeLabel} ← ${afterLabel}. الدرجة40 والدرجة60 والمجموع النهائي محفوظة كلٌّ على حدة؛ لا تُستنتج درجة ناقصة من المجموع.`,'impact-explanation'));
   const stats=el('div',undefined,'impact-metrics');stats.append(metric('بيانات مقارنة كافية',paired.length),metric('تحسن',summary.improved,'positive'),metric('تراجع',summary.declined,'support'),metric('ثبات',summary.stable),metric('متوسط التغير — من '+selected.max,summary.delta));content.append(stats);
   const cats=['تحسن كبير','تحسن متوسط','تحسن بسيط','ثبات','تراجع بسيط','تراجع متوسط','تراجع كبير'];
   content.append(chart('توزيع تغير المؤشر المختار',cats.map(label=>({label,value:paired.length?paired.filter(r=>changeBand(r.changePercent)===label).length/paired.length*100:null})),'نسبة الطلاب ذوي البيانات الكافية %'));
   content.append(table(['الطالب','الفصل','درجة40','درجة60','المجموع /100','التقدير العام',beforeLabel+' — من'+selected.max,afterLabel+' — من'+selected.max,'التغير — من'+selected.max,'فئة التغير'],rows.map(r=>[r.name,className(r),...scoreCells(r),number(r.baseline[metricKey]),number(r.comparison[metricKey]),movement(r.delta),changeBand(r.changePercent)||'غير متاح'])));
   content.append(table(['التقدير العام','عدد الطلاب'],['ممتاز','جيد جدًا','جيد','مقبول','راسب','غير متاح'].map(label=>[label,rows.filter(r=>rating(r.score)===label).length])));
   content.append(el('p','التغير = الدرجة اللاحقة − الدرجة السابقة للمؤشر نفسه. تُحدد فئة التغير بعد تحويله إلى نقاط مئوية بحسب نهاية المؤشر40 أو60 أو100: كبير10 فأكثر، متوسط5 إلى أقل من10، وبسيطأكبر من0 إلى أقل من5؛ ويُعكس الاتجاه للتراجع. التقدير العام دائمًا من المجموع النهائي: ممتاز90، جيد جدًا80، جيد70، مقبول50، وأقل من50 راسب.','impact-method'));
  }
  content.append(el('p',`${data.students.length} سجلًا وهميًا في ستة فصول. تُستبعد النتيجة الناقصة من المتوسط والترتيب؛ المتوسط العام موزون بعدد الطلاب المرصودين. ${term==='year'?'المقارنة بين نتيجتي الفصلين الدراسيين.':'المقارنة بين الفترة الثانية والأولى للفصل المختار.'} الألوان والأسهم تصف الدرجات المسجلة ولا تثبت سبب التحسن أو التراجع.`,'impact-method'));
 }
 entry.addEventListener('click',async()=>{
  report.hidden=true;panel.hidden=false;panel.replaceChildren(el('p','جارٍ إعداد تقارير تتبّع الأثر…','impact-loading'));const request=++requestNumber;
  try{const response=data||await load();if(disposed||request!==requestNumber)return;if(response.demo!==true||!Array.isArray(response.students))throw Error('تعذر إعداد التقرير.');data=response;render();panel.querySelector('h2').focus();}
  catch(error){if(disposed)return;panel.replaceChildren(el('p',error.message,'impact-error'));const b=el('button','العودة إلى التقرير');b.addEventListener('click',back);panel.append(b);onSessionError?.();}
 });
 return ()=>{disposed=true;requestNumber++;data=null;panel.replaceChildren();panel.remove();entry.remove();};
}
