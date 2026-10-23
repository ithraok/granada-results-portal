const valid=(v,max=100)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const pair=(a,b)=>valid(a)&&valid(b)?(a+b)/2:null;
export const impactMetrics={score:{label:'المجموع النهائي',max:100},tasks:{label:'المهام الأدائية',max:40},assessment:{label:'الاختبارات والتطبيقات والمشروعات العملية',max:60}};
export function rating(score){return !valid(score)?'غير متاح':score>=90?'ممتاز':score>=80?'جيد جدًا':score>=70?'جيد':score>=50?'مقبول':'راسب';}
export function observation(student,term='1',period='1'){
 const source=(t,p)=>student.periods?.[`${t}-${p}`]||{};
 const clean=s=>Object.fromEntries(Object.entries(impactMetrics).map(([k,m])=>[k,valid(s[k],m.max)?s[k]:null]));
 const semester=t=>{const a=clean(source(t,'1')),b=clean(source(t,'2'));return Object.fromEntries(Object.keys(impactMetrics).map(k=>[k,pair(a[k],b[k])]));};
 const before=term==='year'?semester('1'):clean(source(term,'1'));
 const after=term==='year'?semester('2'):clean(source(term,'2'));
 const current=term==='year'?Object.fromEntries(Object.keys(impactMetrics).map(k=>[k,pair(before[k],after[k])])):period==='final'?semester(term):clean(source(term,period));
 const changes=Object.fromEntries(Object.keys(impactMetrics).map(k=>[k,before[k]!==null&&after[k]!==null?after[k]-before[k]:null]));
 const savedRating=term!=='year'&&period!=='final'?source(term,period).reportedRating:null;
 return {...current,before:before.score,after:after.score,baseline:before,comparison:after,changes,rating:typeof savedRating==='string'&&savedRating.trim()?savedRating:rating(current.score)};
}
export function impactRows(students,term,period,scope='all',metric='score'){
 if(!impactMetrics[metric])throw Error('Invalid impact metric');
 return students.filter(s=>scope==='all'||scope===`g${s.grade}`||scope===`c${s.grade}-${s.section}`).map(s=>{const o=observation(s,term,period);const delta=o.changes[metric];return {...s,...o,delta,changePercent:delta===null?null:delta/impactMetrics[metric].max*100};});
}
export function summarize(rows,metric='score'){
 const scored=rows.filter(r=>valid(r[metric],impactMetrics[metric].max)),paired=rows.filter(r=>Number.isFinite(r.delta)),totals=rows.filter(r=>valid(r.score));
 const means=Object.fromEntries(Object.entries(impactMetrics).map(([k,m])=>[k,average(rows.filter(r=>valid(r[k],m.max)).map(r=>r[k]))]));
 return {registered:rows.length,recorded:scored.length,missing:rows.length-scored.length,mean:average(scored.map(r=>r[metric])),means,excellent:totals.filter(r=>r.score>=90).length,support:totals.filter(r=>r.score<70).length,paired:paired.length,delta:average(paired.map(r=>r.delta)),improved:paired.filter(r=>r.delta>0).length,declined:paired.filter(r=>r.delta<0).length,stable:paired.filter(r=>r.delta===0).length};
}
export function ranking(rows,ascending=false,metric='score'){return rows.filter(r=>valid(r[metric],impactMetrics[metric].max)).sort((a,b)=>(ascending?a[metric]-b[metric]:b[metric]-a[metric])||a.id.localeCompare(b.id));}
export function groups(rows,kind='class',metric='score'){
 const name=grade=>({4:'الرابع',5:'الخامس',6:'السادس'}[grade]||grade);
 const keys=[...new Set(rows.map(r=>kind==='class'?`${r.grade}-${r.section}`:String(r.grade)))];
 return keys.map(key=>({key,label:kind==='class'?`الصف ${name(key.split('-')[0])} — الفصل ${key.split('-')[1]}`:`الصف ${name(key)}`, ...summarize(rows.filter(r=>kind==='class'?`${r.grade}-${r.section}`===key:String(r.grade)===key),metric)})).sort((a,b)=>(b.mean??-1)-(a.mean??-1)||a.key.localeCompare(b.key));
}
export function recommendation(row){
 if(!valid(row.score))return 'استكمال الرصد أولًا قبل تحديد مستوى الدعم.';
 if(row.score>=90)return 'إثراء بمهام تطبيقية متقدمة، وتشجيع الطالب على شرح مهاراته ومواصلة التميز.';
 if(row.score>=80)return 'تعزيز الدقة وإتقان التفاصيل، ومراجعة الأخطاء مع المحافظة على المشاركة المنتظمة.';
 if(row.score>=70)return 'مراجعة المهارات التي تحتاج تدريبًا إضافيًا، وإنجاز مهمة قصيرة أسبوعيًا ومتابعة تقدم الطالب.';
 const focus=valid(row.tasks,40)&&valid(row.assessment,60)?(row.tasks/40<row.assessment/60?'متابعة الواجبات والمشاركة وإنجاز المهام الأدائية':'التدرب على مهارات الاختبارات والتطبيقات العملية'):'مراجعة المهارات الأساسية';
 return row.score>=50?`نأمل المتابعة المنزلية وتنظيم وقت التدريب؛ مع التركيز على ${focus} وإعادة التقويم بعد أسبوعين.`:`خطة دعم فردية بالتعاون مع ولي الأمر: ${focus} بخطوات قصيرة، ومتابعة أسبوعية وإعادة التقويم.`;
}
export function changeBand(delta){
 if(!Number.isFinite(delta))return null;
 if(delta>=10-1e-9)return 'تحسن كبير';if(delta>=5-1e-9)return 'تحسن متوسط';if(delta>1e-9)return 'تحسن بسيط';if(Math.abs(delta)<1e-9)return 'ثبات';if(delta>-5+1e-9)return 'تراجع بسيط';if(delta>-10+1e-9)return 'تراجع متوسط';return 'تراجع كبير';
}
