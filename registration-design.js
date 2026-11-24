// 新デザインの表示だけを管理し、値は既存の登録・編集フォームへ渡す。
const RegistrationDesign=(()=>{
 const shells={};
 const byId=id=>document.getElementById(id);
 const section=(title,body)=>{const s=el('section',undefined,'registration-options-section');s.append(el('strong',title));s.append(body);return s;};
 const set=(id,value)=>{const input=byId(id);if(!input||input.disabled)return;input.value=String(value);input.dispatchEvent(new Event('change',{bubbles:true}));};
 const option=(title,active,action)=>{const b=button(title,action,'registration-option');b.setAttribute('aria-pressed',String(active));return b;};
 const ingredientIcon=name=>{const key=Object.entries(IndividualImportMaps.ingredients).find(([id,text])=>/^[a-z]+$/.test(id)&&text===name)?.[0];return name==='ひとくちナッツ'?'Nuts':key==='soy'?'Soybean':key?key[0].toUpperCase()+key.slice(1):'';};
 const known=species=>RegistrationDefaults[C.speciesName(species)]||RegistrationDefaults[species]||RegistrationDefaults[species.replaceAll('(','（').replaceAll(')','）')]||null;
 function sleepType(species){const found=new Set();for(const field of Object.values(SleepEncounters.data))for(const [kind,members] of Object.entries(field))if(members.includes(species))found.add(kind);return found.size===1?[...found][0]:known(species)?.sleepType||'未確認';}
 const facts=species=>({defaults:known(species),type:PokemonTypes.type(species),specialty:pokemonSpecialties[species],sleep:sleepType(species)});
 function speciesList(){const host=byId('registration-species-list');if(!host)return;host.replaceChildren();const q=normalize(byId('pokemon-search').value);const list=names.filter(n=>speciesEnabled(n)&&(!q||normalize(n).includes(q)||normalize(C.speciesName(n)).includes(q))).sort((a,b)=>(nationalDex[a]??Infinity)-(nationalDex[b]??Infinity)||a.localeCompare(b,'ja'));
  for(const species of list){const info=facts(species),title=C.speciesName(species),b=button('',()=>selectRegistrationSpecies(species),'registration-species-option');b.disabled=species==='ミュウ'&&state.pokemon.some(p=>p.species==='ミュウ');b.append(el('small','No. '+String(nationalDex[species]??'—').padStart(3,'0')),el('strong',title));const tags=el('span',undefined,'registration-species-tags'),type=el('small',info.type?typeNames[info.type]||info.type:'未確認'),specialty=el('small',({berry:'きのみ',ingredient:'食材',skill:'スキル',all:'オール'})[info.specialty]||'未確認'),sleep=el('small',info.sleep);if(PokemonTypes.colors[info.type])type.style.backgroundColor=PokemonTypes.colors[info.type];PokemonTypes.applySpecialty(specialty,info.specialty);PokemonTypes.applySleep(sleep,info.sleep);tags.append(type,specialty,sleep);b.append(tags);host.append(b);}
  if(!list.length)host.append(el('p','該当するポケモンがありません。'));
 }
 const typeNames={normal:'ノーマル',fire:'ほのお',water:'みず',electric:'でんき',grass:'くさ',ice:'こおり',fighting:'かくとう',poison:'どく',ground:'じめん',flying:'ひこう',psychic:'エスパー',bug:'むし',rock:'いわ',ghost:'ゴースト',dragon:'ドラゴン',dark:'あく',steel:'はがね',fairy:'フェアリー'};
 const effectNames=['おてスピ','げんき','食材','スキル','EXP','無補正'];
 const effectOrder=[0,2,3,4,1,5];
 let applyingFood=false;
 function foodImage(name){const file=ingredientIcon(name),img=el('img');if(file){img.src='assets/ingredients/'+file+'.svg';img.alt=name;}else{img.alt='';img.hidden=true;}return img;}
 function setFood(prefix,names){applyingFood=true;try{names.forEach((name,i)=>{const input=byId(prefix+'ingredient-'+i);input.value=name;input.dispatchEvent(new Event('change',{bubbles:true}));});}finally{applyingFood=false;}refresh(prefix);}
 function choices(prefix,species){
  const shell=shells[prefix];if(!shell)return;
  const right=shell.right,data=known(species),level=byId(prefix+'level');
  const foodScroll=right.food.scrollTop,natureScroll=right.nature.scrollTop;
  const levels=el('div',undefined,'registration-level-options');
  for(const n of [10,25,30,50,60,70,80]){const b=option(String(n),level.value===String(n),()=>set(prefix+'level',n));b.disabled=level.disabled;levels.append(b);}
  for(const [label,step] of [['＋',1],['－',-1]]){const b=option(label,false,()=>set(prefix+'level',Math.max(1,Math.min(100,(Number(level.value)||1)+step))));b.disabled=level.disabled;levels.append(b);}
  right.basic.replaceChildren(levels);
  const combinations=el('div',undefined,'registration-food-combinations'),available=data?.ingredients;
  if(available?.every(values=>values.length))for(const a of available[0])for(const b of available[1])for(const c of available[2]){
   const names=[a,b,c],current=names.every((name,i)=>byId(prefix+'ingredient-'+i).value===name),choice=option('',current,()=>setFood(prefix,names));
   choice.classList.add('registration-food-combination');choice.setAttribute('aria-label',names.join('・'));
   names.forEach(name=>{const icon=foodImage(name);if(icon.hidden)choice.append(el('small',name));else choice.append(icon);});combinations.append(choice);
  }
  right.food.replaceChildren(combinations);right.food.scrollTop=foodScroll;
  const skill=byId(prefix+'skill'),skillButtons=el('div',undefined,'registration-skill-options');
  for(const item of [...skill.options].filter(o=>o.value)){const b=option(item.textContent,skill.value===item.value,()=>set(prefix+'skill',item.value));b.disabled=skill.disabled;skillButtons.append(b);}
  right.skill.replaceChildren(skillButtons);
  const ids=Array.from({length:5},(_,i)=>(prefix==='profile-'?'subskill-':'register-subskill-')+i),values=ids.map(id=>byId(id).value),active=shell.activeSubskill||0;
  const subButtons=el('div',undefined,'registration-subskill-options');
  for(const value of [...byId(ids[0]).options].map(o=>o.value).filter(Boolean)){
   const b=option(value,values[active]===value,()=>{const next=values[active]===value?'':value;if(next)shell.activeSubskill=Math.min(active+1,4);set(ids[active],next);});
   b.disabled=values.some((other,i)=>i!==active&&other===value);b.classList.add('registration-subskill-'+IndividualDev.rank(value));subButtons.append(b);
  }
  right.sub.replaceChildren(subButtons);
  const mode=shell.natureMode||'up',nature=byId(prefix+'nature'),natureButtons=el('div',undefined,'registration-nature-options');
  natureButtons.setAttribute('aria-label','性格の選択肢');natureButtons.tabIndex=0;
  const sorted=[...natures].sort((a,b)=>effectOrder.indexOf(IndividualDev.natureEffect(a)[mode==='up'?0:1])-effectOrder.indexOf(IndividualDev.natureEffect(b)[mode==='up'?0:1]));
  for(const name of sorted){const [up,down]=IndividualDev.natureEffect(name),other=mode==='up'?down:up,button=option(name,nature.value===name,()=>set(prefix+'nature',name));button.dataset.effect=String(mode==='up'?up:down);button.setAttribute('aria-label',name);button.disabled=nature.disabled;if(other!==5&&other!==null)button.append(el('small',effectNames[other]+(mode==='up'?'▼':'▲')));natureButtons.append(button);}
  right.nature.replaceChildren(natureButtons);natureButtons.scrollTop=natureScroll;
 }
 function row(layout,part,left){const wrapper=el('section',undefined,'registration-editor-row registration-editor-'+part),right=el('div',undefined,'registration-editor-right');right.dataset.part=part;wrapper.append(left,right);layout.append(wrapper);return right;}
 function preview(prefix,layout,top,details){
  const isEdit=prefix==='profile-',view=layout,rights={};
  const basic=el('div',undefined,'registration-editor-left registration-basic-left'),head=el('div',undefined,'registration-left-head'),shiny=button('',()=>{const input=byId(prefix+'shiny');if(input.disabled)return;input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}));},'registration-shiny'),type=el('small',undefined,'registration-type'),name=el('strong',undefined,'registration-pokemon-name'),specialty=el('small',undefined,'registration-specialty');
  shiny.type='button';shiny.setAttribute('aria-label','色違い');TabIcons.add(shiny,'sparkles');head.append(shiny,type,name,specialty);if(isEdit)head.append(byId('profile-species-select').closest('label'));
  const levelRow=el('div',undefined,'registration-level-row'),level=el('strong','1','registration-level-value'),nickname=byId(isEdit?'profile-nickname':'nickname').closest('label');
  levelRow.append(el('span','Lv.','registration-level-caption'),level,nickname);basic.append(head,levelRow);rights.basic=row(layout,'basic',basic);
  const food=el('div',undefined,'registration-editor-left registration-food-left'),held=el('div',undefined,'registration-held'),berryRow=el('div',undefined,'registration-berry-row'),berry=el('small',undefined,'registration-berry'),berryCount=el('small',undefined,'registration-berry-count');
  held.append(el('span','最大所持数','registration-held-title'),el('span','—','registration-held-value'));berryRow.append(berry,berryCount);food.append(held,berryRow);
  const foods=el('div',undefined,'registration-food-preview');for(let i=0;i<3;i++){const slot=el('div',undefined,'registration-food-slot'),img=el('img');img.dataset.slot=String(i);img.className='registration-ingredient-icon';img.hidden=true;slot.append(el('small','Lv.'+[1,30,60][i]),img);foods.append(slot);}food.append(foods);rights.food=row(layout,'food',food);
  const skill=el('div',undefined,'registration-editor-left registration-skill-preview');rights.skill=row(layout,'skill',skill);
  const sub=el('div',undefined,'registration-editor-left registration-subskill-preview');for(const [i,n] of [10,25,50,70,80].entries()){const slot=button('',()=>{shells[prefix].activeSubskill=i;refresh(prefix);},'registration-subskill-slot');slot.append(el('small','Lv.'+n),el('span',undefined,'registration-subskill-value'));slot.dataset.slot=String(i);slot.setAttribute('aria-label','Lv.'+n+'のサブスキルを選択');sub.append(slot);}rights.sub=row(layout,'sub',sub);
  const nature=el('div',undefined,'registration-editor-left registration-nature-left'),natureValue=el('div',undefined,'registration-nature-preview'),modes=el('div',undefined,'registration-nature-modes'),effects=el('div',undefined,'registration-nature-effects');
  for(const [mode,label] of [['up','▲'],['down','▼']]){const b=button(label,()=>{shells[prefix].natureMode=mode;refresh(prefix);},'registration-nature-mode');b.dataset.natureMode=mode;b.setAttribute('aria-label',mode==='up'?'上昇する能力':'下降する能力');modes.append(b);}
  for(const index of effectOrder){const b=button(effectNames[index],()=>{const list=rights.nature.querySelector('.registration-nature-options'),target=[...list.children].find(child=>child.dataset.effect===String(index));if(target)list.scrollTop=target.offsetTop-list.firstElementChild.offsetTop;},'registration-nature-effect');b.dataset.effect=String(index);effects.append(b);}
  nature.append(natureValue,modes,effects);rights.nature=row(layout,'nature',nature);
  const extra=el('div',undefined,'registration-editor-extra');extra.append(el('small','出会った日'),el('small','一緒に眠った時間'));layout.append(extra);
  const model=el('div',undefined,'registration-model'),date=el('label','出会った日'),field=el('input');field.id=prefix+'met-date';field.type='date';date.append(field);model.append(top,details,date);layout.after(model);
  return {view,rights};
 }
 function refresh(prefix){const shell=shells[prefix];if(!shell)return;const species=prefix==='profile-'?byId('profile-species-select').value:selected;if(!species)return;
  const info=facts(species),data=info.defaults,view=shell.view,level=Number(byId(prefix+'level').value)||1;
  view.querySelector('.registration-pokemon-name').textContent=C.speciesName(species);view.querySelector('.registration-level-value').textContent=String(level);
  const type=view.querySelector('.registration-type');type.textContent=typeNames[info.type]||'未確認';type.style.backgroundColor=PokemonTypes.colors[info.type]||'#aaa';
  const specialty=view.querySelector('.registration-specialty');specialty.textContent=({berry:'きのみ',ingredient:'食材',skill:'スキル',all:'オール'})[info.specialty]||'未確認';specialty.style.backgroundColor=PokemonTypes.specialtyColors[info.specialty]||'#aaa';
  const shiny=view.querySelector('.registration-shiny');shiny.setAttribute('aria-pressed',String(byId(prefix+'shiny').checked));shiny.disabled=byId(prefix+'shiny').disabled;
  view.querySelector('.registration-berry').textContent=data?.berry||'';
  const subIds=Array.from({length:5},(_,i)=>(prefix==='profile-'?'subskill-':'register-subskill-')+i),berryFinding=subIds.some((id,i)=>byId(id).value==='きのみの数S'&&level>=[10,25,50,70,80][i]);
  view.querySelector('.registration-berry-count').textContent='×'+((['berry','all'].includes(info.specialty)?2:1)+(berryFinding?1:0));
  const skill=view.querySelector('.registration-skill-preview');skill.replaceChildren();const chosen=byId(prefix+'main-skill').value,p={species,...SK.fields(chosen)},appearance=SkillActions.appearance(p),icon=el('span',undefined,'registration-skill-icon');icon.style.setProperty('--registration-skill-icon','url("assets/record-pokemon/'+appearance[0]+'.svg")');icon.style.backgroundColor=appearance[1];skill.append(icon,el('span',SK.name(chosen)||'メインスキル未設定'),el('small','Lv.'+(byId(prefix+'skill').value||'1')));
  for(let i=0;i<3;i++){const image=view.querySelector('.registration-ingredient-icon[data-slot="'+i+'"]'),name=byId(prefix+'ingredient-'+i).value,file=ingredientIcon(name);image.hidden=!file;if(file){image.src='assets/ingredients/'+file+'.svg';image.alt=name;}}
  for(let i=0;i<5;i++){const slot=view.querySelector('.registration-subskill-slot[data-slot="'+i+'"]'),value=byId(subIds[i]).value;slot.querySelector('.registration-subskill-value').textContent=value;slot.classList.remove('registration-subskill-gold','registration-subskill-blue','registration-subskill-white');if(value)slot.classList.add('registration-subskill-'+IndividualDev.rank(value));slot.setAttribute('aria-pressed',String(i===(shell.activeSubskill||0)));}
  const value=byId(prefix+'nature').value,natureInfo=IndividualDev.natureEffect(value);view.querySelector('.registration-nature-preview').textContent=value+(natureInfo[0]!==null&&natureInfo[0]!==5?' · '+effectNames[natureInfo[0]]+'▲':'')+(natureInfo[1]!==null&&natureInfo[1]!==5?' '+effectNames[natureInfo[1]]+'▼':'');
  for(const b of view.querySelectorAll('.registration-nature-mode'))b.setAttribute('aria-pressed',String(b.dataset.natureMode===(shell.natureMode||'up')));
  choices(prefix,species);
 }
 function stage(name){const shell=shells['register-'];byId('register-panel').dataset.registrationStage=name;byId('add-pokemon').hidden=name!=='details';shell.view.hidden=name!=='details';shell.selectScreen.hidden=name!=='select';}
 function select(){stage('select');speciesList();}
 function selectedSpecies(species){if(!species)return;const data=facts(species).defaults;if(data?.ingredients?.[0]?.[0]&&!byId('register-ingredient-0').value)byId('register-ingredient-0').value=data.ingredients[0][0];shells['register-'].activeSubskill=0;stage('details');refresh('register-');}
 function edit(){shells['profile-'].activeSubskill=0;refresh('profile-');}
 function attach(prefix,parent){
  const isEdit=prefix==='profile-',shell=el('div',undefined,'registration-design-shell'),layout=el('div',undefined,'registration-editor-layout'),top=byId(prefix+'top-grid'),details=byId(prefix+'details');shell.append(layout);parent.append(shell);
  const {view,rights}=preview(prefix,layout,top,details);shells[prefix]={view,right:rights,activeSubskill:0,natureMode:'up'};
  if(!isEdit){const selectScreen=el('div',undefined,'registration-select-shell'),list=el('div',undefined,'registration-species-list'),search=byId('pokemon-search').closest('label');list.id='registration-species-list';selectScreen.append(el('div'),el('div',undefined,'registration-design-controls'));selectScreen.lastElementChild.append(search,list);shell.prepend(selectScreen);shells[prefix].selectScreen=selectScreen;byId('registration-fields').hidden=true;byId('pokemon-search').addEventListener('input',speciesList);}
  for(const input of shell.querySelectorAll('input,select'))input.addEventListener('change',()=>{if(!applyingFood)refresh(prefix);});
 }
 function init(){const register=byId('register-panel'),form=register.querySelector('.register-entry-form'),editForm=byId('profile-form');register.classList.add('registration-redesign-panel');byId('individual-editor').classList.add('registration-redesign-panel');attach('register-',form);attach('profile-',editForm);select();}
 return {init,select,selectedSpecies,edit,refresh,speciesList};
})();
