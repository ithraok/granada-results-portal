// Preserve saved period scores. Pending periods never enter semester/year averages.
const termName=term=>term==='2'?'الثاني':'الأول';
export function performanceRecommendation(score){
 if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)return '';
 if(score>=90)return 'أداء متميز واستيعاب عالٍ ومشاركة فعّالة.\nالتوصية: استمر على تميزك وواصل تطوير مهاراتك نحو الأفضل دائمًا.';
 if(score>=80)return 'أداء قوي وفهم عالٍ مع مشاركة جيدة داخل الحصة.\nالتوصية: حافظ على مستواك وركز على الدقة وإتقان التفاصيل لتصل للممتاز دائمًا.';
 if(score>=70)return 'أداء جيد، ويمكن رفع المستوى بمراجعة المهارات التي تحتاج تدريبًا إضافيًا.\nالتوصية: واصل الاجتهاد وراجع المهارات التي تحتاج إلى تعزيز، مع الحرص على المشاركة وإنجاز المهام بانتظام.';
 if(score>=50)return 'مستوى مقبول ويحتاج دعمًا إضافيًا في الفهم والالتزام بإنجاز المهام.\nالتوصية: نأمل المتابعة المنزلية وتنظيم وقت المذاكرة وإنجاز الواجبات أولًا بأول نحو الأفضل دائمًا.';
 return 'يحتاج إلى خطة دعم مكثفة لتحسين الفهم ورفع مستوى الإنجاز.\nالتوصية: نأمل المتابعة المستمرة وتنفيذ خطة علاجية بالتعاون مع المدرسة والالتزام بإعادة التدريب حتى يتحسن المستوى نحو الأفضل دائمًا.';
}
function semesterData(data,term){
 if(!['1','2'].includes(term))throw Error('INVALID_TERM');
 if(data.demo===true&&data.terms?.[term])return data.terms[term];
 const sourceTerm=data.academicTerm==='الثاني'?'2':'1';
 if(term!==sourceTerm)return null;
 return {periods:{'1':data,...(data.demo===true&&data.periods?.['2']?{'2':data.periods['2']}:{})}};
}
export function semesterTotals(data,term='1'){
 const source=semesterData(data,term),first=source?.periods?.['1'],second=source?.periods?.['2'];
 const ready=Boolean(first&&second&&[2,3].every(i=>[first.scores?.[i]?.[1],second.scores?.[i]?.[1]].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=(i===2?40:60))));
 if(!ready)return {ready:false,tasks:null,assessments:null,total:null};
 const tasks=(first.scores[2][1]+second.scores[2][1])/2,assessments=(first.scores[3][1]+second.scores[3][1])/2;
 return {ready:true,tasks,assessments,total:tasks+assessments};
}
export function periodView(data,period='1',term='1'){
 if(!['1','2','final'].includes(period))throw Error('INVALID_PERIOD');
 const semester=semesterData(data,term),totals=semesterTotals(data,term),name=termName(term);
 if(period==='final')return {period,term,title:'📊 التقدير التقريبي لنهاية الفصل الدراسي '+name,status:'احتساب تقديري غير رسمي — النتيجة الرسمية هي المعتمدة في نظام نور',showNotes:false,showCalculation:true,showAnnual:false,scores:[
 ['المتوسط التقديري للمهام الأدائية للفترتين من 40',totals.ready?totals.tasks:'بانتظار اكتمال الفترتين','green','🌟'],
 ['المتوسط التقديري للاختبارات والتطبيقات والمشروعات العملية للفترتين من 60',totals.ready?totals.assessments:'بانتظار اكتمال الفترتين','blue','📘'],
 ['المجموع التقديري لنهاية الفصل الدراسي '+name+' من 100',totals.ready?totals.total:'بانتظار اكتمال الفترتين','','']]};
 const source=semester?.periods?.[period],second=period==='2',word=second?'الثانية':'الأولى';
 return {period,term,title:'📊 تفاصيل الأداء والدرجات — الفصل الدراسي '+name+' — الفترة '+word,status:source?'الفصل الدراسي '+name+' — الفترة '+word:'لم يبدأ الرصد — الأصفار للعرض، وليست درجات نهائية مرصودة',showNotes:true,showCalculation:false,showAnnual:false,
 scores:(source?.scores||data.scores).map(([label,value,tone,icon],index)=>[label.replace(/الفترة (الأولى|الثانية)/g,'الفترة '+word),source?value:index===0?'لم يبدأ الرصد':index>=10?'':0,tone,icon]),
 homework:source?(source.homework??''):'',notes:source?(source.notes??''):'',teacherRecommendation:source?performanceRecommendation(source.scores?.[1]?.[1]):''};
}
export function annualView(data){
 const first=semesterTotals(data,'1'),second=semesterTotals(data,'2');
 const ready=first.ready&&second.ready,total=ready?(first.total+second.total)/2:null;
 const rows=[];
 for(const term of ['1','2']){const semester=semesterData(data,term),name=termName(term);for(const period of ['1','2'])rows.push(['الفصل الدراسي '+name+' — الفترة '+(period==='1'?'الأولى':'الثانية'),semester?.periods?.[period]?.scores?.[1]?.[1]??null]);const totals=term==='1'?first:second;rows.push(['نهاية الفصل الدراسي '+name,totals.ready?totals.total:null]);}
 const components=[['ملخص المهام الأدائية من 40',first.ready&&second.ready?(first.tasks+second.tasks)/2:'بانتظار اكتمال الفصلين','green','🌟'],['ملخص الاختبارات التحريرية والإلكترونية والتطبيقات والمشروعات العملية من 60',first.ready&&second.ready?(first.assessments+second.assessments)/2:'بانتظار اكتمال الفصلين','blue','📘']];
 return {period:'final',term:'year',title:'📊 النتيجة النهائية للعام الدراسي',status:ready?'متوسط نتيجتي الفصلين الدراسيين من 100':'بانتظار اكتمال الفترات في الفصلين الدراسيين',showNotes:false,showCalculation:true,showAnnual:true,rows,components,scores:[
 ['نتيجة الفصل الدراسي الأول من 100',first.ready?first.total:'لم تكتمل بعد','blue','📘'],
 ['نتيجة الفصل الدراسي الثاني من 100',second.ready?second.total:'لم تكتمل بعد','green','🌟'],
 ['النتيجة النهائية للعام الدراسي من 100',ready?total:'بانتظار اكتمال الفصلين','','']]};
}
