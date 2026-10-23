// Presentation only: use saved values and approved recommendation text; never calculate grades.
const maxima={1:100,2:40,3:60,4:10,5:40,6:10,7:20,8:20};
const numberWithin=(value,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max;
const present=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
export function noBehaviorConcern(value){
 const text=String(value??'').normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[.،؛!؟…]/g,'').replace(/\s+/g,' ').trim();
 return text===''||text==='-'||/^(?:لا توجد|لاتوجد|لا يوجد) (?:ملاحظات|ملحوظات)(?: (?:هذا الأسبوع|لهذا الأسبوع|حاليا|مسجلة|على الطالب))?(?:\s*[—-]\s*مثال تجريبي)?$/.test(text);
}
export function reportCardModels(view){
 const period=view.showNotes===true;
 const rows=indices=>indices.map(index=>view.scores[index]).filter(score=>score&&present(score[1])).map(score=>[score[0],score[1]]);
 const models=view.scores.map((score,index)=>{
  const [label,value,tone,icon]=score;
  const maximum=period?maxima[index]:view.isComponents?[40,60][index]:view.showAnnual?100:[40,60,100][index];
  const recorded=period?view.recorded===true:true;
  let detailRows=[],detailText='';
  if(period&&recorded){
   if(index===1)detailRows=rows([2,3]);
   if(index===2)detailRows=rows([4,6,8]);
   if(index===3)detailRows=rows([5,7]);
   if(index===0)detailText=view.teacherRecommendation||'';
  }else if(!period&&!view.isComponents&&index===2){detailRows=rows([0,1]);}
  const narrative=period&&index>=10;
  const longText=narrative&&(String(value??'').length>180||String(value??'').split('\n').length>3);
  if(longText)detailText=String(value??'');
  const rating=String(value??'').replace(/[\u064b-\u065f\u0670\u0640]/g,'').trim();
  const ratingTone=period&&index===0?({'ممتاز':'excellent','جيد جدا':'very-good','جيد':'good','مقبول':'acceptable','راسب':'needs-support'}[rating]||'pending'):'';
  return {index,score:[label,value,tone,icon],maximum,progress:recorded&&maximum&&numberWithin(value,maximum)?value:null,
   narrative,longText,detailRows,detailText,ratingTone,primary:period&&index<2,
   neutral:narrative&&index===11&&noBehaviorConcern(value),interactive:detailRows.length>0||detailText.length>0};
 });
 return period?[models[1],models[0],...models.slice(2)]:models;
}
export function displayScore(value){
 if(value===null||value===undefined||value==='')return 'لم يُرصد';
 if((typeof value==='number'||typeof value==='string'&&/^\s*\d+(?:\.\d+)?\s*$/.test(value))&&Number.isFinite(Number(value)))return String(Math.round(Number(value)));
 return String(value);
}
const digits=value=>String(value).replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)<=0x669?0x660:0x6f0)));
function toggleHint(){const hint=document.createElement('span');hint.className='card-toggle';const closed=document.createElement('span'),open=document.createElement('span'),arrow=document.createElement('span');closed.className='when-closed';closed.textContent='عرض التفاصيل';open.className='when-open';open.textContent='إخفاء التفاصيل';arrow.className='detail-arrow';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');hint.append(closed,open,arrow);return hint;}
function paragraph(text,className=''){const p=document.createElement('p');p.className=className;p.textContent=text;return p;}
export function createReportCard(model){
 const [label,value,tone,icon]=model.score,card=document.createElement(model.interactive?'details':'section');
 card.className=['grade',model.neutral?'neutral':tone,model.narrative?'source-text':'',model.primary?'primary-card':'',model.ratingTone?'rating-'+model.ratingTone:'',model.interactive?'interactive':'',model.longText?'long-text':''].filter(Boolean).join(' ');
 card.dataset.cardIndex=String(model.index);
 const core=model.interactive?document.createElement('summary'):document.createElement('div');core.className='card-core';
 const title=document.createElement('h3'),text=document.createElement('span'),symbol=document.createElement('span');text.textContent=digits(label);symbol.textContent=model.neutral?'':icon;symbol.setAttribute('aria-hidden','true');title.append(text,symbol);
 const valueWrap=document.createElement('div');valueWrap.className='grade-number';
 const val=paragraph(model.narrative?String(value??''):displayScore(value),'grade-value'+(model.longText?' summary-preview':''));
 val.dataset.numeric=String(typeof value==='number'&&Number.isFinite(value));valueWrap.append(val);
 if(model.progress!==null&&model.maximum){const maximum=document.createElement('span');maximum.className='grade-maximum';maximum.textContent='من '+model.maximum;valueWrap.append(maximum);}
 core.append(title,valueWrap);
 if(model.progress!==null&&model.maximum){const progress=document.createElement('progress');progress.className='score-progress';progress.max=model.maximum;progress.value=model.progress;progress.setAttribute('aria-label',digits(label)+' — '+value+' من '+model.maximum);core.append(progress);}
 if(model.interactive)core.append(toggleHint());card.append(core);
 if(model.interactive){
  const body=document.createElement('div');body.className='card-details';
  if(model.detailRows.length){const list=document.createElement('dl');for(const [name,score]of model.detailRows){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=digits(name);dd.textContent=displayScore(score);row.append(dt,dd);list.append(row);}body.append(list);}
  if(model.detailText)body.append(paragraph(model.detailText,'detail-copy'));
  card.append(body);
 }
 return card;
}
export function renderNarrativeNote(note,text){
 const title=note.dataset.noteTitle??note.querySelector('strong')?.textContent??'';note.dataset.noteTitle=title;
 const heading=document.createElement('strong');heading.className='note-heading';heading.textContent=title;note.replaceChildren(heading);
 const copy=String(text??'');
 if(copy.length>180||copy.split('\n').length>3){const disclosure=document.createElement('details');disclosure.className='note-disclosure long-text';const summary=document.createElement('summary');summary.append(paragraph(copy,'summary-preview'),toggleHint());const body=document.createElement('div');body.className='card-details';body.append(paragraph(copy,'detail-copy'));disclosure.append(summary,body);note.append(disclosure);}
 else note.append(paragraph(copy,'note-copy'));
}
export function installPrintDetails(root,eventTarget=window){
 let previous=null;
 const before=()=>{if(previous)return;previous=new Map();root.querySelectorAll('details').forEach(detail=>{previous.set(detail,detail.open);detail.open=true;});};
 const after=()=>{if(!previous)return;for(const [detail,open]of previous)if(detail.isConnected)detail.open=open;previous=null;};
 eventTarget.addEventListener('beforeprint',before);eventTarget.addEventListener('afterprint',after);
 return {before,after};
}
