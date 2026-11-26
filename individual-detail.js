// View state belongs to this screen only. Editing continues through the profile form.
const IndividualDetail=(()=>{
 const levels=[10,25,50,70,80],unknown='未確認';
 let id,tab,target;
 const root=()=>$('pokemon-individual-detail');
 const text=(value,cls='')=>el('span',String(value??unknown),cls);
 const group=cls=>el('div',undefined,cls);
 function init(){const section=el('section');section.id='pokemon-individual-detail';section.hidden=true;$('team').prepend(section);}
 function open(key){id=key;tab='individual';target=null;if(refresh())TeamUI.show('detail');}
 function heading(p,m){
  const box=group('detail-heading');box.append(text('Lv. '+(m.level??'—'),'detail-level'));
  const name=group('detail-names');name.append(text(m.name||unknown),text(p.nickname||m.name||unknown));box.append(name);
  if(m.info.shiny)box.append(text('✦','detail-shiny'));return box;
 }
 function food(name,amount,lv){
  const item=group('detail-food');if(lv)item.append(text('Lv.'+lv));
  if(name){const image=RegistrationDesign.foodImage(name);item.append(image.hidden?text(name):image,text('×'+(amount??'—')));}else item.append(text('—'));
  return item;
 }
 function subskill(m,i){
  const box=group('detail-subskill');box.append(text('Lv.'+levels[i]),text(m.subskills[i]||'—'));
  if(m.subskills[i])box.dataset.rank=IndividualDev.rank(m.subskills[i]);if(levels[i]>m.level)box.classList.add('locked');return box;
 }
 function values(p,m,left,right){
  left.append(heading(p,m));
  const type=PokemonTypes.type(p.species),tag=text(RegistrationDesign.typeNames[type]||unknown,'detail-type');
  tag.style.backgroundColor=PokemonTypes.colors[type]||'';left.append(tag);
  const items=group('detail-items');items.append(text('最大所持数 '+(m.carry??unknown)),text((m.berry||unknown)+' ×'+(m.berryCount??'—')));left.append(items);
  const foods=group('detail-foods');[1,30,60].forEach((lv,i)=>foods.append(food(m.foods[i],m.amounts[i],lv)));left.append(foods);
  const skill=group('detail-skill'),icon=text('','registration-skill-icon'),[file,color]=SkillActions.appearance(p);
  icon.style.setProperty('--registration-skill-icon','url("assets/record-pokemon/'+file+'.svg")');icon.style.backgroundColor=color;
  skill.append(icon,text(SK.name(SK.forPokemon(p))||unknown),text('Lv.'+(p.profile?.skillLevel??m.info.mainSkillLevel??'—')));left.append(skill);
  const subs=group('detail-subs');levels.forEach((_,i)=>subs.append(subskill(m,i)));left.append(subs);
  const effects={speed:'おてスピ',energy:'げんき',ingredient:'食材',skill:'スキル',exp:'EXP'};
  const nature=group('detail-nature');nature.append(text(m.n?.name||unknown));
  if(m.n&&effects[m.n.positiveModifier])nature.append(text('▲ '+effects[m.n.positiveModifier]+'　▼ '+effects[m.n.negativeModifier]));left.append(nature);
  if(m.info.metDate)left.append(text('出会った日　'+m.info.metDate,'detail-date'));
  if(m.info.sleepHours!=null)left.append(text('眠った時間　'+m.info.sleepHours+'時間','detail-date'));
  right.append(text('1日あたり','detail-caption'));
  const performance=group('detail-performance');
  performance.append(text('きのみエナジー'),text(m.berries.ok?Math.round(m.berries.berryEnergy).toLocaleString('ja-JP'):unknown,'detail-total'));
  performance.append(text('食材'));if(m.food.ok){const row=group('detail-yields');for(const ing of DetailData.ingredients){const count=m.food.counts[ing.id];if(count>0)row.append(food(ing.name,Number(count.toFixed(1))));}performance.append(row);}else performance.append(text(unknown));
  performance.append(text('スキル発動回数'),text(unknown));right.append(performance);
 }
 function graph(m){
  const node=group('detail-graph');
  for(const lv of [...new Set([1,10,20,25,30,40,50,60,70,80,m.level,target].filter(Number.isFinite))].sort((a,b)=>a-b)){
   const row=group('detail-milestone');row.dataset.phase=lv<=m.level?'current':lv<=target?'target':'later';
   const i=levels.indexOf(lv),ing=[1,30,60].indexOf(lv);
   row.append(i>=0?subskill(m,i):group(''),text('Lv.'+lv,'detail-marker'),ing>=0?food(m.foods[ing],m.amounts[ing]):group(''));node.append(row);
  }return node;
 }
 // No bag inventory has been registered. Keep this separate from growth costs.
 const inventory=()=>({candy:null,shards:null});
 function growth(p,m,left,right){
  left.append(heading(p,m));right.append(text('Lv. '+(target??'—'),'detail-level'));
  const choices=group('detail-targets'),cap=DetailData.meta.calcCap;
  for(const v of [10,25,30,50,60,70,'＋','－']){
   const lv=v==='＋'?target+1:v==='－'?target-1:v;
   const b=button(String(v),()=>{target=lv;refresh();});b.disabled=!m.level||lv<m.level||lv>cap;b.setAttribute('aria-pressed',String(v===target));choices.append(b);
  }right.append(choices);
  const costs=DetailModel.totals(m,target),bag=inventory(),table=el('table');table.className='detail-costs';
  for(const row of [['','アメ','ゆめのかけら'],['必要総数',costs?.candy?.toLocaleString()??unknown,costs?.shards?.toLocaleString()??unknown],['バッグ所持数',bag.candy??'未登録',bag.shards??'未登録'],['不足数','未登録','未登録']]){
   const tr=table.insertRow();for(const v of row)tr.insertCell().textContent=v;
  }left.append(graph(m));right.append(table,text('現在Lv.の開始時点から','detail-caption'));
 }
 function refresh(){
  const p=state.pokemon.find(x=>x.id===id);if(!p)return false;
  const m=DetailModel.inspect(p);target=Number.isInteger(m.level)?Math.max(m.level,target??m.level):null;
  const panel=root(),nav=group('detail-tabs');panel.replaceChildren();
  for(const [key,title] of [['individual','個体値'],['growth','育成リソース']]){
   const b=button(title,()=>{tab=key;refresh();});b.setAttribute('aria-pressed',String(tab===key));nav.append(b);
  }panel.append(nav);
  const grid=group('detail-columns'),left=group('detail-column'),right=group('detail-column');grid.append(left,right);panel.append(grid);
  if(tab==='individual')values(p,m,left,right);else growth(p,m,left,right);
  const actions=group('detail-actions');actions.append(button('もどる',()=>TeamUI.show('team')),button('編集',()=>openIndividualEditor(p,'detail')));panel.append(actions);return true;
 }
 return {init,open,refresh};
})();
