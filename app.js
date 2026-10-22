import {periodView,annualView} from './period-model.mjs';
(()=>{'use strict';
const root=document.getElementById('granada-results'),find=id=>root.querySelector('#'+id);
let busy=false,timer,currentReport=null;
const notes=[...root.querySelectorAll('.note')],tabs=[...root.querySelectorAll('[data-period-tab]')];
const messages={TRY_LATER:'تجاوزت عدد المحاولات. انتظر 15 دقيقة ثم حاول مجددًا.',SERVICE_NOT_READY:'الخدمة قيد التجهيز. حاول لاحقًا.',NO_MATCH:'تعذر مطابقة البيانات. تحقق من الهوية وجوال ولي الأمر المسجل لدى المدرسة.'};
async function api(path,body){const res=await fetch('/api/guardian/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store'});const data=await res.json();if(!res.ok)throw new Error(messages[data.error]||'انتهت الجلسة أو تعذر الاتصال. أعد البحث.');return data;}
const englishDigits=s=>String(s).replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)<=0x669?0x660:0x6f0)));
function card([label,value,tone,icon]){const section=document.createElement('section');section.className='grade '+tone;const title=document.createElement('h3'),text=document.createElement('span'),symbol=document.createElement('span');text.textContent=englishDigits(label);symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');title.append(text,symbol);const val=document.createElement('p');val.className='grade-value';val.dataset.numeric=String(typeof value==='number'&&Number.isFinite(value));val.textContent=(value===null||value===undefined||value==='')?'لم يُرصد':((typeof value==='number'||(typeof value==='string'&&/^\s*\d+(?:\.\d+)?\s*$/.test(value)))&&Number.isFinite(Number(value))?String(Math.round(Number(value))):String(value));section.append(title,val);return section;}
function renderPeriod(period){
 if(!currentReport)return;
 const term=find('gr-term').value,year=term==='year',view=year?annualView(currentReport):periodView(currentReport,period,term);
 root.dataset.period=view.period;root.dataset.term=term;
 root.querySelector('.period-tabs').hidden=year;
 tabs.forEach(tab=>{const active=tab.dataset.periodTab===period;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
 find('gr-grades').setAttribute('aria-labelledby',year?'period-heading':'gr-period-'+period);
 find('gr-term-label').textContent=year?'العام الدراسي':term==='2'?'الفصل الدراسي الثاني':'الفصل الدراسي الأول';
 find('period-heading').textContent=view.title;find('period-status').textContent=view.status;
 find('gr-grades').replaceChildren(...view.scores.map(card));
 notes.forEach(note=>note.hidden=!view.showNotes);
 if(view.showNotes){notes[0].querySelector('p').textContent=view.homework;notes[1].querySelector('p').textContent=view.notes;}
 find('final-calculation').hidden=!view.showCalculation;find('semester-calculation').hidden=year;find('annual-calculation').hidden=!year;
 find('annual-components').replaceChildren(...(view.components||[]).map(card));find('annual-breakdown').hidden=!view.showAnnual;find('annual-rows').replaceChildren();
 if(view.showAnnual)for(const [label,value]of view.rows){const row=document.createElement('tr'),name=document.createElement('td'),score=document.createElement('td');name.textContent=label;score.textContent=value===null?'لم يُرصد':typeof value==='number'?String(Math.round(value)):String(value);row.append(name,score);find('annual-rows').append(row);}
}
function reset(){find('gr-term').value='1';find('annual-rows').replaceChildren();find('annual-components').replaceChildren();find('annual-breakdown').hidden=true;clearTimeout(timer);currentReport=null;find('gr-demo-notice').hidden=true;find('gr-report').hidden=true;find('gr-search').hidden=false;find('gr-test').hidden=root.dataset.mode==='live';find('gr-grades').replaceChildren();notes.forEach(note=>note.querySelector('p').textContent='');find('final-calculation').hidden=true;find('period-status').textContent='';for(const id of ['demo-name','demo-id','demo-grade','demo-section'])find(id).textContent='';find('gr-form').reset();}
function show(data){currentReport=data;find('gr-demo-notice').hidden=data.demo!==true;if(data.academicYear)root.querySelectorAll('.student-meta b')[2].textContent=data.academicYear;find('demo-name').textContent=data.name;find('demo-id').textContent=data.reference;find('demo-grade').textContent=data.grade;find('demo-section').textContent=data.section;find('gr-date').textContent=new Date().toLocaleDateString('ar-SA');find('gr-form').reset();find('gr-search').hidden=true;find('gr-test').hidden=true;find('gr-report').hidden=false;find('gr-term').value=data.academicTerm==='الثاني'?'2':'1';renderPeriod('1');find('gr-period-1').focus();timer=setTimeout(()=>{reset();find('gr-msg').textContent='انتهت الجلسة. أعد البحث لعرض التقرير.';},600000);}
find('gr-term').addEventListener('change',()=>renderPeriod('1'));
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>renderPeriod(tab.dataset.periodTab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowLeft')next=(index+1)%tabs.length;else if(event.key==='ArrowRight')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();renderPeriod(tabs[next].dataset.periodTab);tabs[next].focus();});});
find('gr-form').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;busy=true;const button=event.submitter||find('gr-form').querySelector('button');button.disabled=true;find('gr-msg').textContent='جارٍ البحث…';try{await api('login',{studentId:find('gr-id').value,guardianPhone:find('gr-phone').value});const result=await api('result');find('gr-msg').textContent='';show(result);}catch(error){find('gr-msg').textContent=error.message;}finally{busy=false;button.disabled=false;}});
find('gr-back').addEventListener('click',async()=>{reset();find('gr-id').focus();try{await api('logout',{});find('gr-msg').textContent='';}catch{find('gr-msg').textContent='تعذر تأكيد تسجيل الخروج. أغلق المتصفح لإنهاء الاستخدام.';}});
find('gr-print').addEventListener('click',()=>window.print());window.addEventListener('pageshow',event=>{if(event.persisted)reset();});reset();
})();