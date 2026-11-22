'use strict';
const FieldHistoryUI=(()=>{
 let selected='',start='',editing=null,body=null,ready=false,manualDay='',manualField='',bar=null;
 const stamp=date=>Number.isFinite(date.getTime())?C.localInput(date):'';
 function context(date=recordDate()){const key=stamp(date);if(!key)return {field:'',status:'missing',confirmed:false};return manualDay===C.gameDay(date)?{field:manualField,status:'manual',confirmed:false}:FieldHistory.inherited(state,date);}
 function field(date=recordDate()){return context(date).field;}
 function saved(){manualDay='';manualField='';}
 function syncBar(){
  if(!bar)return;
  const date=recordDate();if(!Number.isFinite(date.getTime()))return;
  const value=C.localInput(date),day=value.slice(0,10),weekday=['日曜日','月曜日','火曜日','水曜日','木曜日','金曜日','土曜日'][new Date(day+'T12:00:00Z').getUTCDay()];
  bar.date.textContent=day.replaceAll('-','/')+' '+weekday;
  bar.compact.textContent=Number(day.slice(5,7))+'/'+Number(day.slice(8))+' '+weekday[0];
  bar.time.textContent=value.slice(11,16);
  bar.now.hidden=$('auto-now').checked;
  if(document.activeElement!==bar.dateInput)bar.dateInput.value=value;
  if(document.activeElement!==bar.timeInput)bar.timeInput.value=value.slice(11,16);
 }
 function keepClockField(day){if(manualDay&&manualField)manualDay=day;}
 function select(value,aria){const input=el('select');input.setAttribute('aria-label',aria);input.add(new Option('フィールドを選択',''));for(const f of FieldHistory.definitions)input.add(new Option(f.name,f.id));if(value&&!FieldHistory.fields.includes(value))input.add(new Option(value,value));input.value=value||'';return input;}
 function sync(){
  if(!ready)return;syncBar();const root=$('record-field-row'),date=recordDate(),day=Number.isFinite(date.getTime())?C.gameDay(date):'';if(manualDay&&manualDay!==day){manualDay='';manualField='';}const value=context(date);root.replaceChildren();
  const choice=select(value.field,'記録フィールド');choice.id='record-field';choice.className='record-event-field';root.append(choice);
  const hint=$('record-field-hint');hint.replaceChildren();hint.hidden=value.confirmed===true||value.status==='inherited';hint.style.display=hint.hidden?'none':'';
  if(!hint.hidden)hint.append(el('small',value.field?'記録するまで保存されません':'フィールドを選択'));
  bar.icon.style.color=FieldHistory.info(choice.value).color;
  choice.onchange=()=>{manualDay=day;manualField=choice.value;sync();render();};
 }

 function showHistory(root){body=root;if(!selected){selected=C.gameDay(new Date());start=selected.slice(0,7)+'-01';}render();}
 function open(){SleepUI.selectFieldHistory();}
 function monthOffset(date,offset){const d=new Date(date+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,10);}
 function currentField(){const today=C.gameDay(new Date()),monday=FieldHistory.week(today),candidates=[];
  for(const [i,r] of (state.fieldHistory||[]).entries()){let date=r.date,at=r.time?FieldHistory.instant(r):Date.parse(date+'T04:00:00+09:00');if(r.scope==='record'){const [kind,id]=r.sourceId?.split(':')||[],source=(kind==='sleep'?state.sleepSessions:kind==='shard'?state.shardRecords:state.records)?.find(x=>x.id===id);if(source){date=kind==='sleep'?source.date:kind==='shard'&&source.targetDate?source.targetDate:C.gameDay(new Date(source.datetime));at=Date.parse(source.datetime||source.recordedAt)||Date.parse(date+'T04:00:00+09:00');}}
   if(date>=monday&&date<=today&&r.field)candidates.push({date,at,field:r.field,order:i});}
  candidates.sort((a,b)=>a.date.localeCompare(b.date)||a.at-b.at||a.order-b.order);const latest=candidates.at(-1);if(latest)return latest;const resolved=FieldHistory.resolve(state,today);return {field:resolved.field,date:resolved.entry?.date||today};
 }
 function render(){
  if(!body)return;body.replaceChildren();const selectedField=FieldHistory.dayView(state,selected),currentHeading=el('div',undefined,'field-history-current');currentHeading.append(el('time',C.displayDate(selected)),el('strong',FieldHistory.info(selectedField.field).name));body.append(currentHeading);const nav=el('div',undefined,'field-history-nav');nav.append(button('＜',()=>{start=monthOffset(start,-1);render();}),button('今日',()=>{selected=C.gameDay(new Date());start=selected.slice(0,7)+'-01';render();}),button('＞',()=>{start=monthOffset(start,1);render();}));body.append(nav);
  const calendar=el('div',undefined,'field-history-weeks');calendar.setAttribute('aria-label','月ごとのフィールド履歴');
  const month=el('section'),heading=el('h3',Number(start.slice(0,4))+'年'+Number(start.slice(5,7))+'月'),first=FieldHistory.week(start),end=monthOffset(start,1);month.append(heading);
  for(let monday=first;monday<end;monday=FieldHistory.add(monday,7)){const row=el('div',undefined,'field-history-days');for(let i=0;i<7;i++){
   const d=FieldHistory.add(monday,i),v=FieldHistory.dayView(state,d),b=button('',()=>{selected=d;render();});b.dataset.day=d;if(d.slice(0,7)!==start.slice(0,7))b.classList.add('field-history-outside-month');b.setAttribute('aria-pressed',String(selected===d));b.setAttribute('aria-label',C.displayDate(d)+' '+(v.colors.filter(Boolean).map(f=>FieldHistory.info(f).name).join('→')||'未登録'));
   const alpha=v.confirmed?44:15,colors=v.colors.length?v.colors:[''];b.style.background='linear-gradient(90deg,'+colors.flatMap((f,i)=>{const c=f?'color-mix(in srgb,'+FieldHistory.info(f).color+' '+alpha+'%,var(--mh-surface))':'var(--mh-surface)';return [c+' '+i/colors.length*100+'%',c+' '+(i+1)/colors.length*100+'%'];}).join(',')+')';
   b.append(el('small',d.slice(8)==='01'?Number(d.slice(5,7))+'月':['月','火','水','木','金','土','日'][i]),el('strong',String(Number(d.slice(8)))));if(v.colors.some(f=>FieldHistory.info(f).ex))b.append(el('small','EX'));row.append(b);
  }month.append(row);}calendar.append(month);body.append(calendar);
 }
 function details(){
  const view=FieldHistory.dayView(state,selected),box=el('section',undefined,'field-history-detail');box.append(el('h3',C.displayDate(selected)));
  const rows=(state.fieldHistory||[]).filter(r=>r.scope!=='record'&&(r.date===selected||r.scope==='week'&&r.date===FieldHistory.week(selected)));
  if(rows.length){for(const r of rows){const line=el('div',undefined,'field-history-change');line.append(el('span',FieldHistory.info(r.field).name+(r.time?' '+r.time:'')),button('編集',()=>{editing=r.id;render();}),button('削除',async ()=>{if(!confirm('このフィールド履歴を削除しますか？'))return;if(await commit({...state,fieldHistory:(state.fieldHistory||[]).filter(x=>x.id!==r.id)},'フィールド履歴を削除')){editing=null;sync();render();}},'danger'));box.append(line);}}
  else{const line=el('div',undefined,'field-history-change');line.append(el('span',FieldHistory.info(view.field).name),button('編集',()=>{editing='new';render();}));box.append(line);}if(typeof historyActionIcons==='function')historyActionIcons(box);
  if(editing){const original=rows.find(r=>r.id===editing),form=el('form'),date=el('input'),fieldInput=select(original?.field||view.field,'履歴のフィールド'),toggle=el('input'),time=el('input'),check=el('label',undefined,'check');Object.assign(date,{type:'date',value:original?.time&&Number(original.time.slice(0,2))<4?FieldHistory.add(original.date,1):original?.date||selected,required:true});date.setAttribute('aria-label','フィールド変更日');Object.assign(toggle,{type:'checkbox',checked:!!original?.time});check.append(toggle,el('span','時刻を指定する'));Object.assign(time,{type:'time',value:original?.time||'',required:toggle.checked,hidden:!toggle.checked});time.setAttribute('aria-label','フィールド変更時刻');toggle.onchange=()=>{time.hidden=!toggle.checked;time.required=toggle.checked;};
   const row=el('div',undefined,'field-history-inputs');row.append(date,fieldInput);const save=el('button',original?'変更を保存':'保存');save.type='submit';fieldInput.required=true;form.append(row);if(original&&original.scope!=='week')form.append(check,time);form.append(save,button('キャンセル',()=>{editing=null;render();}));const error=el('p');error.setAttribute('role','alert');form.append(error);
   form.onsubmit=async e=>{e.preventDefault();try{const item={...(original||{}),id:original?.id||uid(),date:toggle.checked&&time.value?C.gameDay(C.fromInput(date.value+'T'+time.value)):date.value,time:toggle.checked?time.value:null,field:fieldInput.value};if(toggle.checked&&!time.value)throw Error('変更時刻を入力してください。');const next=!original||original.scope==='week'?FieldHistory.saveWeek(state,item.date,item.field,item.id,view.confirmed&&original?.confirmed!==false):FieldHistory.save(state,item);if(await commit(next,'フィールドを保存')){selected=item.date;editing=null;sync();render();}}catch(e){error.textContent=e.message;}};box.append(form);}
  body.append(box);
 }
 function init(){
  const card=$('record').querySelector('.record-date-card'),row=el('div',undefined,'record-date-row'),fieldRow=el('div',undefined,'record-field-row'),hint=el('div',undefined,'record-field-hint'),timeBox=el('div',undefined,'record-bar-time-box');
  const shift=offset=>{const input=$('datetime'),value=C.localInput(recordDate()),day=C.addDays(value.slice(0,10),offset);input.value=day+value.slice(10);input.dispatchEvent(new Event('input',{bubbles:true}));};
  const prev=button('‹',()=>shift(-1),'record-bar-arrow'),date=el('span',undefined,'record-bar-date'),full=el('span',undefined,'record-bar-full'),compact=el('span',undefined,'record-bar-compact'),next=button('›',()=>shift(1),'record-bar-arrow'),time=el('span',undefined,'record-bar-time'),now=button('現在',()=>{keepClockField(C.gameDay(new Date()));$('auto-now').checked=true;$('auto-now').dispatchEvent(new Event('change',{bubbles:true}));},'record-bar-now');
  const dateTap=el('span',undefined,'record-bar-date-tap'),timeTap=el('span',undefined,'record-bar-time-tap'),dateInput=el('input'),timeInput=el('input');
  dateInput.type='datetime-local';timeInput.type='time';dateInput.id='record-bar-native-date';timeInput.id='record-bar-native-time';dateInput.dataset.nativeRange='true';
  dateInput.setAttribute('aria-label','記録日時を選択');timeInput.setAttribute('aria-label','記録時刻を選択');
  let timeBase='';const prepare=()=>{const value=C.localInput(recordDate());dateInput.value=value;timeInput.value=value.slice(11,16);timeBase=value;};
  dateInput.addEventListener('pointerdown',prepare);timeInput.addEventListener('pointerdown',prepare);
  dateInput.addEventListener('focus',prepare);timeInput.addEventListener('focus',prepare);
  const apply=value=>{if(value===C.localInput(recordDate()))return;const input=$('datetime');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
  dateInput.onchange=()=>{if(Number.isFinite(C.fromInput(dateInput.value).getTime()))apply(dateInput.value);};
  timeInput.onchange=()=>{if(/^([01]\d|2[0-3]):[0-5]\d$/.test(timeInput.value))apply((timeBase||C.localInput(recordDate())).slice(0,11)+timeInput.value);};
  prev.setAttribute('aria-label','前日');next.setAttribute('aria-label','翌日');date.id='record-bar-date';time.id='record-bar-time';date.append(full,compact);dateTap.append(date,dateInput);timeTap.append(time,timeInput);timeBox.append(timeTap,now);
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','2');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');icon.setAttribute('aria-hidden','true');icon.classList.add('record-bar-field-icon');icon.innerHTML='<path d="m8 3 4 8 5-5 5 15H2L8 3z" />';
  fieldRow.id='record-field-row';hint.id='record-field-hint';row.append(prev,dateTap,next,timeBox,icon,fieldRow,...card.children);card.append(row,hint);bar={date:full,compact,time,now,dateInput,timeInput,icon};ready=true;sync();
 }
 return {init,sync,syncBar,keepClockField,context,field,saved,open,showHistory};
})();
