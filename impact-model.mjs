const valid=(v,max=100)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const pair=(a,b)=>valid(a)&&valid(b)?(a+b)/2:null;
export function observation(student,term='1',period='1'){
 const source=(t,p)=>student.periods?.[`${t}-${p}`];
 const semester=t=>{const a=source(t,'1'),b=source(t,'2');return {score:pair(a?.score,b?.score),tasks:pair(a?.tasks,b?.tasks),assessment:pair(a?.assessment,b?.assessment)};};
 if(term==='year'){const a=semester('1'),b=semester('2');return {score:pair(a.score,b.score),tasks:pair(a.tasks,b.tasks),assessment:pair(a.assessment,b.assessment),before:a.score,after:b.score};}
 if(period==='final'){const s=semester(term);return {...s,before:source(term,'1')?.score,after:source(term,'2')?.score};}
 const s=source(term,period)||{};return {...s,score:valid(s.score)?s.score:null,before:source(term,'1')?.score,after:source(term,'2')?.score};
}
export function impactRows(students,term,period,scope='all'){
 return students.filter(s=>scope==='all'||scope===`g${s.grade}`||scope===`c${s.grade}-${s.section}`).map(s=>{const o=observation(s,term,period);return {...s,...o,delta:valid(o.before)&&valid(o.after)?o.after-o.before:null};});
}
export function summarize(rows){
 const scored=rows.filter(r=>valid(r.score)),paired=rows.filter(r=>Number.isFinite(r.delta));
 return {registered:rows.length,recorded:scored.length,missing:rows.length-scored.length,mean:average(scored.map(r=>r.score)),excellent:scored.filter(r=>r.score>=90).length,support:scored.filter(r=>r.score<70).length,paired:paired.length,delta:average(paired.map(r=>r.delta)),improved:paired.filter(r=>r.delta>0).length,declined:paired.filter(r=>r.delta<0).length,stable:paired.filter(r=>r.delta===0).length};
}
export function ranking(rows,ascending=false){return rows.filter(r=>valid(r.score)).sort((a,b)=>(ascending?a.score-b.score:b.score-a.score)||a.id.localeCompare(b.id));}
export function groups(rows,kind='class'){
 const name=grade=>({4:'الرابع',5:'الخامس',6:'السادس'}[grade]||grade);
 const keys=[...new Set(rows.map(r=>kind==='class'?`${r.grade}-${r.section}`:String(r.grade)))];
 return keys.map(key=>({key,label:kind==='class'?`الصف ${name(key.split('-')[0])} — الفصل ${key.split('-')[1]}`:`الصف ${name(key)}`, ...summarize(rows.filter(r=>kind==='class'?`${r.grade}-${r.section}`===key:String(r.grade)===key))})).sort((a,b)=>(b.mean??-1)-(a.mean??-1)||a.key.localeCompare(b.key));
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
export function trainingImpact(row){
 const list=row.trainings?.filter(t=>valid(t.score,t.max)&&typeof t.max==='number'&&t.max>0)||[];
 const test=row.test;
 const training=list.length?list.reduce((n,t)=>n+t.score,0)/list.reduce((n,t)=>n+t.max,0)*100:null;
 const testPercent=test&&typeof test.max==='number'&&test.max>0&&valid(test.score,test.max)?test.score/test.max*100:null;
 const delta=training!==null&&testPercent!==null?testPercent-training:null;
 return {training,test:testPercent,delta,band:changeBand(delta)};
}
