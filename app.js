import {periodView,annualView} from './period-model.mjs';
import {reportCardModels,createReportCard,renderNarrativeNote,installPrintDetails} from './report-cards.mjs';
(()=>{'use strict';
const root=document.getElementById('granada-results'),find=id=>root.querySelector('#'+id);
let resultUpdatedAt=null;
let busy=false,timer,currentReport=null,disposeImpact=null;
const notes=[...root.querySelectorAll('.note')],tabs=[...root.querySelectorAll('[data-period-tab]')];
const messages={TRY_LATER:'تجاوزت عدد المحاولات. انتظر 15 دقيقة ثم حاول مجددًا.',SERVICE_NOT_READY:'الخدمة قيد التجهيز. حاول لاحقًا.',NO_MATCH:'تعذر مطابقة البيانات. تحقق من الهوية وجوال ولي الأمر المسجل لدى المدرسة.'};
async function api(path,body){const res=await fetch(path==='impact'?'/api/teacher/impact':'/api/guardian/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});if(path==='result')resultUpdatedAt=res.headers.get('X-Data-Updated-At');const data=await res.json();if(!res.ok)throw new Error(messages[data.error]||'انتهت الجلسة أو تعذر الاتصال. أعد البحث.');return data;}
const printDetails=installPrintDetails(root);
function formatUpdate(value){if(!value||!Number.isFinite(+new Date(value)))return 'غير متاح حاليًا';const date=new Date(value),zone={timeZone:'Asia/Riyadh'},dp=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{...zone,day:'numeric',month:'numeric',year:'numeric'}).formatToParts(date),get=type=>dp.find(p=>p.type===type).value,stamp=get('day')+'-'+get('month')+'-'+get('year'),tp=new Intl.DateTimeFormat('en-US',{...zone,hour:'2-digit',minute:'2-digit',hour12:true}).formatToParts(date),hour=tp.find(p=>p.type==='hour').value,minute=tp.find(p=>p.type==='minute').value,period=tp.find(p=>p.type==='dayPeriod').value==='AM'?'صباحًا':'مساءً';return '\u2066'+stamp+'\u2069 — \u2066'+hour+':'+minute+'\u2069 '+period;}

function updateTime(selector,value){for(const target of root.querySelectorAll(selector+' time')){target.textContent=formatUpdate(value);if(value)target.dateTime=value;else target.removeAttribute('datetime');}}
async function refreshDataStatus(){try{const response=await fetch('/api/data-status',{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error();const data=await response.json();updateTime('[data-public-update]',data.updatedAt);}catch{updateTime('[data-public-update]',null);}}
refreshDataStatus();setInterval(()=>{if(!document.hidden)refreshDataStatus();},60000);

function mountImpact(){const link=document.createElement('a');link.id='gr-impact';link.href='https://granada-teacher-impact.granada-results-demo.workers.dev/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='تتبّع الأثر — دخول المعلم الخاص';link.style.cssText='display:inline-block;padding:11px 17px;border-radius:10px;background:#173f73;color:white;font-weight:700;text-decoration:none;font-size:14px;line-height:1.8';find('gr-report').querySelector('.actions').append(link);return()=>link.remove();}
function renderPeriod(period){
 if(!currentReport)return;
 const term=find('gr-term').value,year=term==='year',view=year?annualView(currentReport):periodView(currentReport,period,term);
 root.dataset.period=view.period;root.dataset.term=term;
 root.querySelector('.period-tabs').hidden=year;
 tabs.forEach(tab=>{const active=tab.dataset.periodTab===period;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
 find('gr-grades').setAttribute('aria-labelledby',year?'period-heading':'gr-period-'+period);
 find('period-heading').textContent=view.title;find('period-status').textContent=view.status;
 find('gr-grades').replaceChildren(...reportCardModels(view).map(createReportCard));
 notes.forEach(note=>note.hidden=!view.showNotes);
 if(view.showNotes){renderNarrativeNote(notes[0],view.homework);renderNarrativeNote(notes[1],view.teacherRecommendation);}
 find('final-calculation').hidden=!view.showCalculation;find('semester-calculation').hidden=year;find('annual-calculation').hidden=!year;
 find('annual-components').replaceChildren(...reportCardModels({scores:view.components||[],isComponents:true}).map(createReportCard));find('annual-breakdown').hidden=!view.showAnnual;find('annual-rows').replaceChildren();
 if(view.showAnnual)for(const [label,value]of view.rows){const row=document.createElement('tr'),name=document.createElement('td'),score=document.createElement('td');name.textContent=label;score.textContent=value===null?'لم يُرصد':typeof value==='number'?String(Math.round(value)):String(value);row.append(name,score);find('annual-rows').append(row);}
}
function reset(){disposeImpact?.();disposeImpact=null;printDetails.after();find('gr-term').value='1';find('annual-rows').replaceChildren();find('annual-components').replaceChildren();find('annual-breakdown').hidden=true;clearTimeout(timer);currentReport=null;find('gr-demo-notice').hidden=true;find('gr-report').hidden=true;find('gr-search').hidden=false;find('gr-test').hidden=root.dataset.mode==='live';find('gr-grades').replaceChildren();notes.forEach(note=>renderNarrativeNote(note,''));find('final-calculation').hidden=true;find('period-status').textContent='';for(const id of ['demo-name','demo-id','demo-grade','demo-section'])find(id).textContent='';find('gr-form').reset();}
function show(data){updateTime('[data-report-update]',resultUpdatedAt);disposeImpact?.();disposeImpact=null;if(data.demo===true&&data.teacherTools===true)disposeImpact=mountImpact({root,report:find('gr-report'),load:()=>api('impact')});currentReport=data;find('gr-demo-notice').hidden=data.demo!==true;if(data.academicYear)root.querySelectorAll('.student-meta b')[2].textContent=data.academicYear;find('demo-name').textContent=data.name;find('demo-id').textContent=data.reference;find('demo-grade').textContent=data.grade;find('demo-section').textContent=data.section;find('gr-date').textContent=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{timeZone:'Asia/Riyadh',year:'numeric',month:'long',day:'numeric'}).format(new Date());find('gr-form').reset();find('gr-search').hidden=true;find('gr-test').hidden=true;find('gr-report').hidden=false;find('gr-term').value=data.academicTerm==='الثاني'?'2':'1';renderPeriod('1');find('gr-period-1').focus();timer=setTimeout(()=>{reset();find('gr-msg').textContent='انتهت الجلسة. أعد البحث لعرض التقرير.';},600000);}
find('gr-term').addEventListener('change',()=>renderPeriod('1'));
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>renderPeriod(tab.dataset.periodTab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowLeft')next=(index+1)%tabs.length;else if(event.key==='ArrowRight')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();renderPeriod(tabs[next].dataset.periodTab);tabs[next].focus();});});
find('gr-form').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;busy=true;const button=event.submitter||find('gr-form').querySelector('button');button.disabled=true;find('gr-msg').textContent='جارٍ البحث…';try{await api('login',{studentId:find('gr-id').value,guardianPhone:find('gr-phone').value});const result=await api('result');find('gr-msg').textContent='';show(result);}catch(error){find('gr-msg').textContent=error.message;}finally{busy=false;button.disabled=false;}});
find('gr-back').addEventListener('click',async()=>{reset();find('gr-id').focus();try{await api('logout',{});find('gr-msg').textContent='';}catch{find('gr-msg').textContent='تعذر تأكيد تسجيل الخروج. أغلق المتصفح لإنهاء الاستخدام.';}});
find('gr-print').addEventListener('click',()=>window.print());window.addEventListener('pageshow',event=>{if(event.persisted)reset();});reset();
})();
