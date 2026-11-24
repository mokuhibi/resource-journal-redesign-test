// 編成内の表示状態だけを管理。保存する個体・編成・履歴の形式は変えません。
const TeamUI=(()=>{
 let drag=null,suppressClick=false;
 let view='team',editing=false,editOrigin='roster',registerEntry='';let columns=4,rosterView='skills',rosterSort='dex-asc',combinedPage=0,selectedSlot=null,assigning=false;
 const sortModes=[['dex-asc','図鑑▲'],['dex-desc','図鑑▼'],['level-asc','Lv▲'],['level-desc','Lv▼']];
 const typeNames={normal:'ノーマル',fire:'ほのお',water:'みず',electric:'でんき',grass:'くさ',ice:'こおり',fighting:'かくとう',poison:'どく',ground:'じめん',flying:'ひこう',psychic:'エスパー',bug:'むし',rock:'いわ',ghost:'ゴースト',dragon:'ドラゴン',dark:'あく',steel:'はがね',fairy:'フェアリー'};
 // 表示専用。個体IDや保存された名前・スキルは変更しない。
 function name(p){
  const root=el('span',undefined,'team-individual-name');
  const nickname=p?.nickname?.trim();
  const primary=el('strong');primary.textContent=p?(nickname||C.speciesName(p.species)||'未確認'):'未設定';root.append(primary);
  if(p&&nickname)root.append(el('small',C.speciesName(p.species)||'未確認'));
  if(p)root.title=label(p);
  return root;
 }
 // Both card lists use one display-only renderer; sorting never rewrites saved manual order.
 const level=p=>{const v=p?.profile?.level??p?.importedIndividual?.level;return Number.isFinite(Number(v))&&Number(v)>0?Number(v):null;};
 function sorted(members){const descending=rosterSort.endsWith('desc'),byLevel=rosterSort.startsWith('level'),dex=p=>nationalDex[p.species]??null;return [...members].sort((a,b)=>{const av=byLevel?level(a):dex(a),bv=byLevel?level(b):dex(b);if(av===null||bv===null)return av===bv?(dex(a)??Infinity)-(dex(b)??Infinity)||String(a.id).localeCompare(String(b.id)):av===null?1:-1;return (av-bv)*(descending?-1:1)||(dex(a)??Infinity)-(dex(b)??Infinity)||String(a.id).localeCompare(String(b.id));});}
 function cardInfo(p){const info=el('div',undefined,'registered-info pokemon-card-info'),lv=level(p),levelText=el('small',undefined,'pokemon-card-level'),speciesName=C.speciesName(p.species)||'未確認',species=el('small',undefined,'pokemon-card-species'),form=/^(.+?)(（.+）|\(.+\))$/.exec(speciesName),nickname=p.nickname?.trim();if(lv!==null)levelText.append(el('span','Lv.'),el('strong',String(lv)));if(form){species.classList.add('has-form');if(nickname)species.append(el('span',form[1],'pokemon-card-species-base'));species.append(el('span',form[2],'pokemon-card-species-form'));}else species.textContent=speciesName;info.append(levelText,el('strong',nickname||form?.[1]||speciesName,'pokemon-card-nickname'),species);if(p.provisional)info.append(el('small','仮登録','provisional-badge'));return info;}

 function typeBorder(node,p){if(typeof PokemonTypes!=='undefined'){PokemonTypes.apply(node,p?.species);if(node.dataset.pokemonType)node.dataset.pokemonTypeLabel=typeNames[node.dataset.pokemonType]||'';}}
 // Saved lineups use IDs only; current and saved slots are copied independently.
 const savedTeam=i=>state.savedTeams?.[i]||{name:'チーム'+(i+1),team:null};
 function saveTeam(i,changes,refresh=true){const savedTeams=Array.from({length:8},(_,n)=>state.savedTeams?.[n]||null);savedTeams[i]={...savedTeam(i),...changes};return commit({...state,savedTeams},'チームを保存',refresh);}
 function useTeam(i){const saved=savedTeam(i);if(!saved.team)return false;return commit({...state,team:[...saved.team]},'編成を保存');}
 function saveCurrent(i){if(savedTeam(i).team&&!confirm(savedTeam(i).name+'を現在のチームで上書きしますか？'))return false;return saveTeam(i,{team:[...state.team]});}
 function renderSavedTeams(){
  $('save-current-team').onclick=()=>AppPanels.open('チームの保存先',body=>{const choices=el('div',undefined,'team-save-choices');for(let i=0;i<8;i++)choices.append(button(savedTeam(i).name||'チーム'+(i+1),async()=>{if(await saveCurrent(i))AppPanels.close();}));body.append(choices);});
  const root=$('saved-teams');root.replaceChildren();
  for(let i=0;i<8;i++){
   const saved=savedTeam(i),section=el('section',undefined,'saved-team'),head=el('div',undefined,'saved-team-head'),title=el('input'),apply=button('編成',()=>useTeam(i));
   title.type='text';title.value=saved.name;title.placeholder='チーム'+(i+1);title.setAttribute('aria-label','チーム'+(i+1)+'の名前');title.onchange=async()=>{if(await saveTeam(i,{name:title.value},false))apply.setAttribute('aria-label',(title.value||title.placeholder)+'を編成');};apply.disabled=!saved.team;apply.setAttribute('aria-label',(saved.name||title.placeholder)+'を編成');head.append(title,apply);
   const slots=el('div',undefined,'saved-team-slots');
   for(let j=0;j<5;j++){
    const id=saved.team?.[j],p=state.pokemon.find(p=>p.id===id),b=button('',()=>TeamPicker.open(j,{name:savedTeam(i).name||'チーム'+(i+1),team:()=>savedTeam(i).team||Array(5).fill(null),save:team=>saveTeam(i,{team}),focusId:'saved-team-'+i+'-slot-'+j}),'team-slot-button');
    const slot=el('div',undefined,'saved-team-slot-row');typeBorder(b,p);b.setAttribute('aria-expanded','false');b.id='saved-team-'+i+'-slot-'+j;b.setAttribute('aria-label','チーム'+(i+1)+'の位置'+(j+1)+'：'+(p?label(p):'未設定'));b.setAttribute('aria-haspopup','dialog');b.append(p?cardInfo(p):name(p));slot.append(el('span',j===0?'1R':String(j+1),'saved-slot-number'),b);slots.append(slot);
   }
   section.append(head,slots);root.append(section);
  }
 }
 function sync(){
  for(const name of ['team','roster','register'])$(name+'-panel').hidden=view!==name||editing;
  $('individual-editor').hidden=!editing;
  $('team-combined').hidden=view!=='team'||editing;
  $('team-action-buttons').hidden=view!=='team'||editing||document.body.dataset.mainTab!=='team';
  for(const b of document.querySelectorAll('[data-team-view]')){b.setAttribute('aria-selected',String(b.dataset.teamView===view));b.tabIndex=b.dataset.teamView===view?0:-1;}
  syncEntry();
 }
 function show(name,entry=''){view=name;editing=false;if(name==='register'){registerEntry=entry;selected='';catalogOpen=false;$('pokemon-search').value='';$('nickname').value='';$('add-pokemon').disabled=true;ProfileForm.reset('');RegistrationDesign.select();}sync();window.scrollTo({top:0});}
 function edit(origin='roster'){editOrigin=['team','roster'].includes(origin)?origin:'roster';view=editOrigin;editing=true;sync();RegistrationDesign.edit();window.scrollTo({top:0});$('profile-back').focus({preventScroll:true});}
 function finishEdit(){show(editOrigin);}
 function registration(){$('registration-fields').hidden=false;ProfileForm.refresh(selected);}
 function renderRoster(root=$('registered-pokemon-list'),displayView=rosterView,search=$('roster-search').value){
  const q=normalize(search);root.replaceChildren();root.style.setProperty('--roster-columns',columns);root.dataset.columns=String(columns);
  const normal=state.pokemon.filter(p=>!special(p));
  const category=p=>['メタモン','マネネ','バリヤード'].includes(p.species)?'スキルコピー':p.species!=='ミュウ'&&SK.id(SK.forPokemon(p))==='metronome'?'ゆびをふる':special(p)?'アメ':relatedPokemon(p)?'ゆめのかけら':'その他のポケモン';
  const target=p=>category(p)!=='その他のポケモン';
  const visible=state.pokemon.filter(p=>(displayView==='skills'?!p.provisional&&target(p):displayView==='registered'?!p.provisional:displayView==='provisional'?p.provisional:true)&&(!q||[p.species,C.speciesName(p.species),p.nickname].some(v=>normalize(v||'').includes(q))));
  for(const b of document.querySelectorAll('[data-roster-view]')){b.setAttribute('aria-pressed',String(b.dataset.rosterView===rosterView));if(b.dataset.rosterView==='provisional'){const n=state.pokemon.filter(p=>p.provisional).length;b.textContent='仮登録'+(n?'('+n+')':'');}}
  const groups=displayView==='skills'?['アメ','ゆめのかけら','スキルコピー','ゆびをふる','その他のポケモン'].map(title=>[title,sorted(visible.filter(p=>category(p)===title))]):[['',sorted(visible)]];
  for(const [title,members] of groups){if(!members.length)continue;if(title)root.append(el('h3',title,'roster-purpose-heading'));const group=el('div',undefined,'individual-roster-grid');root.append(group);
  for(const p of members){
   const line=el('div',undefined,'registered-row'),info=cardInfo(p),actions=el('div',undefined,'row-actions');
   line.setAttribute('role','button');line.tabIndex=0;line.setAttribute('aria-label',label(p)+'を編集');line.onclick=e=>{if(sorting||suppressClick){suppressClick=false;return;}if(!e.target.closest('button'))openIndividualEditor(p);};line.onkeydown=e=>{if(e.target===line&&['Enter',' '].includes(e.key)){e.preventDefault();openIndividualEditor(p);}};line.dataset.pokemonId=p.id;typeBorder(line,p);line.append(info,actions);group.append(line);
  }
  }
  if(!visible.length)root.append(el('p',q?'一致する登録ポケモンがありません。':'表示できる登録ポケモンがありません。'));
 }
 const combinedTeam=page=>page===0?state.team:(savedTeam(page-1).team||Array(5).fill(null));
 function compactCard(p,mode){
  const card=el('div',undefined,'box-compact-card box-compact-'+mode);
  if(!p)return card;
  typeBorder(card,p);
  const species=C.speciesName(p.species)||'未確認',lv=level(p),skill=SK.name(SK.forPokemon(p)),skillLv=p.profile?.skillLevel??p.importedIndividual?.mainSkillLevel;
  const levelRow=el('div',undefined,'box-compact-level-row');if(lv!==null)levelRow.append(el('small','Lv.'+lv,'box-compact-level'));
  const type=card.dataset.pokemonTypeLabel?el('small',card.dataset.pokemonTypeLabel,'box-compact-type'):null;
  if(mode==='box')card.append(levelRow);
  if(type)card.append(type);
  card.append(el('span',species,'box-compact-name'));
  if(SK.forPokemon(p)){
   const row=el('div',undefined,'box-compact-skill-row'),icon=el('span',undefined,'box-compact-skill-icon'),[file,color]=SkillActions.appearance(p);
   icon.style.setProperty('--card-skill-icon',`url("assets/record-pokemon/${file}.svg")`);icon.style.backgroundColor=color;row.title=skill;row.append(icon);
   if(Number(skillLv)>0)row.append(el('small','Lv.'+skillLv,'box-compact-skill-level'));
   card.append(row);
  }
  const ingredients=(p.importedIndividual?.ingredients||[]).filter(Boolean);
  if(ingredients.length){const row=el('div',undefined,'box-compact-ingredients');for(const item of ingredients.slice(0,3)){
   const key=Object.entries(IndividualImportMaps.ingredients).find(([english,japanese])=>/^[a-z]+$/.test(english)&&japanese===item)?.[0];
   const file=item==='ひとくちナッツ'?'Nuts':key==='soy'?'Soybean':key?key[0].toUpperCase()+key.slice(1):null;
   if(file){const img=el('img');img.className='box-compact-ingredient';img.src='assets/ingredients/'+file+'.svg';img.alt=item;row.append(img);}
   else{const fallback=el('span',item,'box-compact-ingredient-fallback');fallback.title=item;row.append(fallback);}
  }card.append(row);}
  const specialty=({berry:'きのみ',ingredient:'食材',skill:'スキル',all:'オール'})[pokemonSpecialties[p.species]];
  if(specialty){const badge=el('small',specialty,'box-compact-specialty');PokemonTypes.applySpecialty(badge,pokemonSpecialties[p.species]);card.append(badge);}
  if(mode==='team')card.append(levelRow);
  card.append(el('small',p.nickname?.trim()||species,'box-compact-nickname'));
  return card;
 }
 function renderCombined(){
  const track=$('team-combined-track'),box=$('team-combined-box'),dots=$('team-combined-dots');if(!track)return;
  track.replaceChildren();dots.replaceChildren();
  for(let page=0;page<9;page++){
   const wrap=el('section',undefined,'team-combined-page'),head=el('div',undefined,'team-combined-name');
   if(page===0){head.append(el('span','現在のチーム'));const save=button('保存',()=>$('save-current-team').click());save.className='team-combined-save';head.append(save);}
   else{const input=el('input');input.type='text';input.value=savedTeam(page-1).name||'チーム'+page;input.setAttribute('aria-label','保存済みチーム'+page+'の名前');input.onchange=()=>saveTeam(page-1,{name:input.value},false);head.append(input);}
   const slots=el('div',undefined,'team-combined-slots'),team=combinedTeam(page);
   for(let i=0;i<5;i++){
    const p=state.pokemon.find(p=>p.id===team[i]),slot=button('',()=>{selectedSlot=selectedSlot?.page===page&&selectedSlot.slot===i?null:{page,slot:i};renderCombinedSelection();},'team-combined-slot');
    slot.dataset.page=String(page);slot.dataset.slot=String(i);slot.setAttribute('aria-label',(page===0?'現在のチーム':savedTeam(page-1).name)+' '+(i===0?'1R':i+1)+'枠 '+(p?label(p):'空き枠'));
    slot.append(el('span',i===0?'1R':String(i+1),'team-combined-slot-number'),compactCard(p,'team'));slots.append(slot);
   }
   wrap.append(head,slots);track.append(wrap);
   const dot=button('',()=>{track.scrollTo({left:track.clientWidth*page,behavior:'smooth'});},'team-combined-dot');dot.setAttribute('aria-label',(page===0?'現在のチーム':savedTeam(page-1).name)+'を表示');dots.append(dot);
  }
  combinedPage=Math.min(combinedPage,8);track.scrollLeft=track.clientWidth*combinedPage;
  $('team-combined-count').textContent=String(state.pokemon.length);
  const query=normalize($('roster-search').value);box.replaceChildren();
  for(const p of state.pokemon.filter(p=>!query||[p.species,C.speciesName(p.species),p.nickname].some(v=>normalize(v||'').includes(query)))){
   const b=button('',()=>selectedSlot?assignCombined(p):openIndividualEditor(p,'team'),'team-combined-pokemon');b.dataset.pokemonId=p.id;b.setAttribute('aria-label',label(p)+(selectedSlot?'を編成':'の個体情報を表示'));
   b.append(compactCard(p,'box'));box.append(b);
  }
  if(!box.children.length)box.append(el('p',query?'一致するポケモンがありません。':'登録済みポケモンがありません。'));
  renderCombinedSelection();
 }
 function renderCombinedSelection(){
  const team=combinedTeam(combinedPage);
  for(const slot of $('team-combined-track').querySelectorAll('.team-combined-slot'))slot.classList.toggle('is-selected',Number(slot.dataset.page)===selectedSlot?.page&&Number(slot.dataset.slot)===selectedSlot?.slot);
  for(const b of $('team-combined-box').querySelectorAll('.team-combined-pokemon')){
   const slot=team.indexOf(b.dataset.pokemonId);b.classList.toggle('is-teammate',slot>=0);b.setAttribute('aria-label',b.getAttribute('aria-label').replace(/を編成$|の個体情報を表示$/,'')+(selectedSlot?'を編成':'の個体情報を表示'));
   let mark=b.querySelector('.team-combined-member-mark');if(mark)mark.remove();if(slot>=0){mark=el('span',slot===0?'1R':String(slot+1),'team-combined-member-mark');b.querySelector('.box-compact-level-row').prepend(mark);}
  }
  [...$('team-combined-dots').children].forEach((dot,i)=>dot.setAttribute('aria-current',i===combinedPage?'true':'false'));
 }
 async function assignCombined(p){
  if(!selectedSlot||assigning||selectedSlot.page!==combinedPage)return;
  const {page,slot}=selectedSlot,team=[...combinedTeam(page)],other=team.indexOf(p.id);
  if(other===slot){selectedSlot=null;renderCombinedSelection();return;}
  if(other>=0)team[other]=team[slot]||null;
  team[slot]=p.id;assigning=true;
  try{const saved=page===0?await commit({...state,team},'編成を保存しました。'):await saveTeam(page-1,{team});if(saved){selectedSlot=null;renderCombined();}}
  finally{assigning=false;}
 }
 function reorder(id,beforeId){
  const xs=[...state.pokemon],from=xs.findIndex(p=>p.id===id),to=xs.findIndex(p=>p.id===beforeId);if(from<0||to<0||from===to)return false;
  const [item]=xs.splice(from,1);xs.splice(to,0,item);
  // 固定の用途別グループは維持し、その中の表示順だけ保存する。
  return commit({...state,pokemon:xs},null);
 }
 function bindReorder(line,p){
  if(!sorting){suppressClick=false;return;}line.classList.add('reorder-enabled');
  let timer=null,start=null,active=false;
  const clear=()=>{clearTimeout(timer);timer=null;line.classList.remove('reorder-dragging');drag=null;};
  line.onpointerdown=e=>{if(e.button!==0||e.target.closest('button'))return;start={x:e.clientX,y:e.clientY};timer=setTimeout(()=>{active=true;suppressClick=true;drag={id:p.id,target:p.id};line.classList.add('reorder-dragging');line.setPointerCapture(e.pointerId);},400);};
  line.onpointermove=e=>{if(!start)return;if(!active){if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)clear();return;}e.preventDefault();const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.registered-row');if(target&&target.parentElement===line.parentElement)drag.target=target.dataset.pokemonId;};
  line.onpointerup=()=>{const move=active&&drag?{...drag}:null;active=false;start=null;clear();if(move&&move.id!==move.target)reorder(move.id,move.target);};
  line.onpointercancel=()=>{active=false;start=null;clear();};line.oncontextmenu=e=>e.preventDefault();
 }
 function init(){
  const combined=el('div',undefined,'team-combined');combined.id='team-combined';
  const teamHeading=el('h2',undefined,'team-combined-heading');teamHeading.append(el('span','チーム編成'));
  const track=el('div',undefined,'team-combined-track');track.id='team-combined-track';track.setAttribute('aria-label','現在のチームと保存済みチーム');
  const dots=el('div',undefined,'team-combined-dots');dots.id='team-combined-dots';
  track.addEventListener('scroll',()=>{const page=Math.max(0,Math.min(8,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));if(page!==combinedPage){combinedPage=page;selectedSlot=null;renderCombinedSelection();}});
  const boxHeading=el('h2',undefined,'team-combined-heading');boxHeading.append(el('span','ボックス'),el('span',undefined,'team-combined-count'));boxHeading.lastChild.id='team-combined-count';
  const searchWrap=el('div',undefined,'team-combined-search');searchWrap.hidden=true;searchWrap.append($('roster-search').closest('label'));
  const box=el('div',undefined,'team-combined-box');box.id='team-combined-box';
  combined.append(teamHeading,track,dots,boxHeading,searchWrap,box);$('team').insertBefore(combined,$('team-panel'));
  const actions=el('div',undefined,'team-action-buttons');actions.id='team-action-buttons';
  for(const [title,icon,action] of [['新規登録','plus',()=>show('register','new')],['検索','search',()=>{searchWrap.hidden=!searchWrap.hidden;if(!searchWrap.hidden)$('roster-search').focus();}]] ){
   const b=button('',action);b.setAttribute('aria-label',title);TabIcons.add(b,icon);actions.append(b);
  }
  $('bottom-actions').append(actions);
  const tabs=[...document.querySelectorAll('[data-team-view]')];
  tabs.forEach((b,i)=>{if(typeof TabIcons!=='undefined')TabIcons.add(b,({team:'users',roster:'list',register:'user-round-plus'})[b.dataset.teamView]);b.onclick=()=>show(b.dataset.teamView);b.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();show(tabs[next].dataset.teamView);tabs[next].focus({preventScroll:true});};});
  $('roster-search').oninput=()=>{renderRoster();renderCombined();};const sort=$('roster-sort');sort.textContent=sortModes[0][1];sort.onclick=()=>{rosterSort=sortModes[(sortModes.findIndex(([key])=>key===rosterSort)+1)%sortModes.length][0];sort.textContent=sortModes.find(([key])=>key===rosterSort)[1];renderRoster();};
  const panel=$('register-panel'),choices=el('div',undefined,'roster-views register-entry-choices'),form=el('div',undefined,'register-entry-form'),importPane=el('div',undefined,'register-entry-import');
  for(const child of [...panel.children])if(child.tagName!=='H2'){(child.classList.contains('individual-import-entry')?importPane:form).append(child);}
  panel.append(choices,form,importPane);
  for(const [key,title] of [['new','新規登録'],['import','データ取り込み']]){const choice=button(title,()=>{registerEntry=key;syncEntry();});choice.dataset.registerEntry=key;choices.append(choice);}
  $('roster-other-toggle').remove();const views=el('div',undefined,'roster-views');for(const [key,title] of [['skills','記録スキル'],['registered','登録済み'],['provisional','仮登録'],['all','すべて']]){const b=button(title,()=>{rosterView=key;renderRoster();});b.dataset.rosterView=key;views.append(b);}$('registered-pokemon-list').before(views);$('roster-search').addEventListener('change',renderRoster);
  const toolbar=el('div',undefined,'profile-editor-actions'),cancel=$('profile-back'),save=$('profile-form').querySelector('button[type=submit]');cancel.textContent='キャンセル';save.textContent='保存';save.classList.add('primary');toolbar.append(cancel,$('profile-remove'),save);$('profile-form').prepend(toolbar);cancel.onclick=finishEdit;
  $('profile-remove').onclick=async()=>{
   const p=state.pokemon.find(p=>p.id===$('profile-select').value);if(!p)return;
   if(confirm(label(p)+'を登録解除しますか？')&&await commit({...state,pokemon:state.pokemon.filter(x=>x.id!==p.id),team:state.team.map(id=>id===p.id?null:id),...(state.savedTeams?{savedTeams:state.savedTeams.map(t=>t?{...t,team:t.team?.map(id=>id===p.id?null:id)||null}:null)}:{})},'登録解除しました。'))finishEdit();
  };
  sync();registration();
 }
 function syncEntry(){const panel=$('register-panel');if(!panel)return;for(const choice of panel.querySelectorAll('[data-register-entry]'))choice.setAttribute('aria-pressed',String(choice.dataset.registerEntry===registerEntry));const form=panel.querySelector('.register-entry-form'),importPane=panel.querySelector('.register-entry-import'),actions=panel.querySelector('.individual-editor-head .profile-editor-actions');if(form)form.hidden=registerEntry!=='new';if(importPane)importPane.hidden=registerEntry!=='import';if(actions)actions.hidden=registerEntry!=='new';}
 return {init,show,edit,finishEdit,sync,registration,renderRoster,renderCombined,name,cardInfo,typeBorder,sorted,reorder,renderSavedTeams,saveCurrent,useTeam,saveTeam,currentView:()=>view};
})();
