// Current-form normal-help model from ねむりの厳選手帳 (Apache-2.0).
// Only the current level, default energy (100), and no camp are used here.
const DetailModel=(()=>{
const D=DetailData,ING_LEVELS=[1,30,60],SKILL_LEVELS=[10,25,50,70,80];
const lookup=(list,id)=>list.find(x=>x.id===id);
const species=id=>lookup(D.pokemon,id),nature=id=>lookup(D.natures,id),skill=id=>lookup(D.subskills,id),berry=id=>lookup(D.berries,id);
function production(p,mode,energy,options,withIngredients){
 const level=p.level,errors=[],ribbonStage=p.ribbon; const sp=species(p.species),n=nature(p.nature);
 if(!sp)errors.push(options.evolution==='final'&&species(p.species)?'最終進化先を選択してください':'種族を選択してください');
 if(sp?.calculationUnsupported)errors.push(sp.calculationUnsupported);
 if(!Number.isInteger(p.level)||p.level<1)errors.push('現在レベルが未入力です');
 if(!n)errors.push('性格が未入力です');
 if(level>D.meta.calcCap)errors.push('Lv.80は将来の構成試算です。収集数は未対応');
 if(![0,20,50,70,100].includes(energy))errors.push('げんき条件が不正です');
 const activeSlots=ING_LEVELS.map((v,i)=>level>=v?i:null).filter(x=>x!==null);
 const activeSkills=SKILL_LEVELS.map((v,i)=>level>=v?i:null).filter(x=>x!==null);
 if(withIngredients)for(const i of activeSlots)if(!p.slots[i]||!sp?.slots[i].some(x=>x.id===p.slots[i])) errors.push(`食材${i+1}枠目を選択してください`);
 for(const i of activeSkills)if(!skill(p.subskills[i]))errors.push(`Lv.${SKILL_LEVELS[i]}のサブスキルが未入力です`);
 if(options.ribbonOverride!==undefined&&options.ribbonOverride!==null&&![0,1,2,3,4].includes(options.ribbonOverride))errors.push('リボン条件が不正です');
 if(sp?.remainingEvolutions>0&&ribbonStage===null)errors.push('おやすみリボンが未入力です');
 if(errors.length)return {ok:false,level,errors};
 const ids=new Set(activeSkills.map(i=>p.subskills[i]));
 const amount=id=>ids.has(id)?skill(id).amount:0;
 const speed=Math.max(.65,1-amount('HELPING_SPEED_S')-amount('HELPING_SPEED_M')-amount('HELPING_BONUS'));
 const rate=sp.ingredientRate*n.ingredient*(1+amount('INGREDIENT_FINDER_S')+amount('INGREDIENT_FINDER_M'));
 const ribbon=D.ribbons.find(x=>x.stage===ribbonStage)?.frequencyByRemainingEvolutions[sp.remainingEvolutions]??1;
 // Keep the adopted arithmetic and rounding order; expose the factors actually used.
 const natureFactor=2-n.frequency,levelFactor=1-.002*(level-1),campFactor=options.camp?1.2:1;
 const combined=Math.round(natureFactor*speed*levelFactor*ribbon*10000)/10000;
 const baseInterval=Math.floor(combined*sp.frequency/campFactor);
 const energyFactor=energy>=80?.45:energy>=60?.52:energy>=40?.58:energy>=1?.66:1;
 const interval=baseInterval*energyFactor,helps=86400/interval;
 const counts=Object.fromEntries(D.ingredients.map(i=>[i.id,0]));
 if(withIngredients)for(const i of activeSlots){const s=sp.slots[i].find(x=>x.id===p.slots[i]);counts[s.id]+=helps*rate*s.amount/activeSlots.length;}
 return {ok:true,level,calculationSpecies:sp.id,camp:!!options.camp,counts,interval,helps,rate,energyFactor,baseInterval,
 helpTrace:{registeredSpecies:p.species,frequency:sp.frequency,remainingEvolutions:sp.remainingEvolutions,ribbonStage,ribbonFactor:ribbon,natureFactor,levelFactor,speedFactor:speed,campFactor,combinedFactor:combined}};
}
function berryPower(id,level){const b=berry(id);return b&&Number.isInteger(level)&&level>=1&&level<=D.meta.calcCap?Math.round(Math.max(b.value+level-1,b.value*Math.pow(1.025,level-1))):null;}
function calcBerry(p,mode,energy,options={},target=null){
 const r=production(p,mode,energy,options,false);if(!r.ok)return r;
 const sp=species(r.calculationSpecies),b=berry(sp.berry);
 if(!b)return {ok:false,level:r.level,errors:['きのみの基礎データが未対応です']};
 if(target&&b.id!==target)return {ok:false,level:r.level,errors:[`この条件では${b.name}を集めます。担当を選び直してください`]};
 const finding=p.subskills.some((id,i)=>id==='BERRY_FINDING_S'&&r.level>=SKILL_LEVELS[i]);
 const perDrop=(['berry','all'].includes(sp.specialty)?2:1)+(finding?1:0);
 const count=r.helps*(1-r.rate)*perDrop,power=berryPower(b.id,r.level);
 if(!Number.isFinite(count)||count<0||power===null)return {ok:false,level:r.level,errors:['きのみの計算条件が未対応です']};
 return {...r,berryId:b.id,perDrop,count,power,berryEnergy:count*power};
}
function inspect(p){
 const info=p.importedIndividual||{},profile=p.profile||{},level=profile.level??info.level;
 const normalizeName=s=>String(s||'').replace(/\s*[(（]/g,'（').replace(/\)/g,'）');
 const name=normalizeName(C.speciesName(p.species)),sp=D.pokemon.find(x=>normalizeName(x.name)===name);
 const n=D.natures.find(x=>x.name===(profile.nature??info.nature));
 const subskills=profile.subskills??info.subskills??[],foods=info.ingredients||[];
 const ribbon=Number.isFinite(info.sleepHours)?D.ribbons.filter(x=>info.sleepHours>=x.hours).at(-1)?.stage:null;
 const input={species:sp?.id,nature:n?.id,level,ribbon,subskills:subskills.map(s=>D.subskills.find(x=>x.name===s)?.id),slots:foods.map(s=>D.ingredients.find(x=>x.name===s)?.id)};
 const amounts=input.slots.map((id,i)=>sp?.slots[i]?.find(x=>x.id===id)?.amount);
 const finding=subskills.some((s,i)=>s==='きのみの数S'&&level>=SKILL_LEVELS[i]);
 const knownSubskills=SKILL_LEVELS.every((lv,i)=>lv>level||input.subskills[i]);
 const base=D.unevolvedCarry[name];
 const carry=Number.isFinite(base)&&ribbon!=null&&knownSubskills&&level?base+D.ribbons[ribbon].carryBonus+input.subskills.reduce((sum,id,i)=>sum+(level>=SKILL_LEVELS[i]&&id?.startsWith("INVENTORY_")?skill(id).amount:0),0):null;
 return {carry,name,info,level,n,subskills,foods,amounts,sp,expClass:D.expClass[name],
  berry:berry(sp?.berry)?.name||RegistrationDefaults[name]?.berry,
  berryCount:sp&&level&&knownSubskills?(sp.specialty==='berry'||sp.specialty==='all'?2:1)+Number(finding):null,
  berries:calcBerry(input,'current',100,{}),food:production(input,'current',100,{},true)};
}
// Unboosted pokesleep-tool calcExpAndCandy, starting at the level boundary.
function totals({level,n,expClass},target){
 if(!Number.isInteger(level)||level<1||target<level||target>D.meta.calcCap)return null;
 if(target===level)return {candy:0,shards:0};
 const rate=({600:1,900:1.5,1080:1.8,1320:2.2})[expClass];
 if(!rate||!n)return null;
 let candy=0,shards=0,carry=0;
 for(let lv=level;lv<target;lv++){
  const amounts=lv<25?[47,40,33]:lv<30?[41,35,29]:[30,25,21];
  const gain=amounts[n.exp>1?0:n.exp<1?2:1];
  const needed=Math.round(D.totalExpToTheLevel[lv+1]*rate)-Math.round(D.totalExpToTheLevel[lv]*rate)-carry;
  const count=Math.ceil(needed/gain);
  candy+=count;shards+=count*D.dreamShardsPerCandy[lv+1];carry=count*gain-needed;
 }
 return {candy,shards};
}
return {inspect,totals};
})();
