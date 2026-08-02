
    function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function shuffle(a,rng){ for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
    function armorMultiplier(gun, armor, armorBreak){ const gap = Math.max(-3,Math.min(3,levels[gun]-(levels[armor]-(armorBreak?1:0)))); return qualityMultipliers[gap]; }
    function effectMultiplier(effect, region, quality){
      const low=quality==="橙";
      if(effect==="upper_body") return ["upper_chest","abdomen","upper_arm","lower_arm"].includes(region)?(low?1.1:1.2):region==="legs"?.8:1;
      if(effect==="torso") return ["upper_chest","abdomen"].includes(region)?(low?1.1:1.2):1;
      if(effect==="arms") return ["upper_arm","lower_arm"].includes(region)?(low?1.1:1.2):1;
      if(effect==="head03") return region==="head"?(low?1.1:1.3):1;
      if(effect==="head05") return region==="head"?(low?1.3:1.5):(low?.9:.8);
      if(effect==="legs") return region==="legs"?(low?1.1:1.2):1;
      return 1;
    }
    function combinedMultiplier(effects,region,quality){ return 1+effects.reduce((sum,e)=>sum+effectMultiplier(e,region,quality)-1,0); }
    function shotDamage(config,region,effects){ return config.damage*config.multipliers[region]*combinedMultiplier(effects,region,config.quality); }
    function armorCovers(armorType,region){
      if(armorType==="全包") return true;
      if(armorType==="半包") return region!=="legs";
      if(armorType==="躯干") return ["upper_chest","abdomen"].includes(region);
      throw new Error(`未知护甲类型：${armorType}`);
    }
    function simulate(config,armorConfig,sequence,mainHit,column,trace=false){
      const {quality:armorQuality,plates,armorType,health:startingHealth=HEALTH,immuneFirstShot=false}=armorConfig;
      let health=startingHealth, armor=plates*ARMOR_PER_PLATE, shots=0, armorBreakIndex=-1;
      const orange=config.quality==="橙";
      while(health>0 && shots<1000){
        shots++;
        const shotIndex=shots-1;
        const immuneShot=immuneFirstShot&&shots===1;
        const region=shotIndex<sequence.length?sequence[shotIndex]:mainHit;
        for(let projectile=0;projectile<config.projectilesPerShot && health>0;projectile++){
          if(immuneShot) continue;
          const rawDamage=shotDamage(config,region,column.effects);
          const fleshRatio=config.builtInFleshRatio+(column.flesh?.1:0);
          const covered=armor>0&&armorCovers(armorType,region);
          const actualDamage=rawDamage*(covered&&orange&&fleshRatio>0?.9:1);
          const armorBreakActive=column.armorBreak&&(!orange||["upper_chest","abdomen"].includes(region));
          const am=armorMultiplier(config.quality,armorQuality,armorBreakActive);
          const armorDamage=actualDamage*am;
          if(covered){
            if(armorDamage<armor){
              armor-=armorDamage;
              health-=actualDamage*fleshRatio;
            }
            else {
              const remaining=armor; armor=0; armorBreakIndex=shotIndex;
              const consumedDamage=remaining/am;
              const overflowDamage=actualDamage-consumedDamage;
              health-=Math.max(0,consumedDamage*fleshRatio+overflowDamage);
            }
          } else health-=rawDamage*config.unarmoredDamageMultiplier;
        }
      }
      return trace?{shots,armorBreakIndex,shotsUsed:shots}:shots;
    }
    const EXACT_ENUMERATION_LIMIT = 100000;
    function cappedCombination(n,k,limit=EXACT_ENUMERATION_LIMIT){
      if(k<0||k>n) return 0;
      let value=1;
      for(let i=1;i<=k;i++){
        value=value*(n-k+i)/i;
        if(value>limit) return limit+1;
      }
      return value;
    }
    function exactPatternCount(slots,pool){
      const counts=new Map();
      pool.forEach(region=>counts.set(region,(counts.get(region)||0)+1));
      let value=cappedCombination(slots,pool.length);
      if(value>EXACT_ENUMERATION_LIMIT) return value;
      let remaining=pool.length;
      for(const count of counts.values()){
        const arrangements=cappedCombination(remaining,count);
        value*=arrangements;
        if(value>EXACT_ENUMERATION_LIMIT) return EXACT_ENUMERATION_LIMIT+1;
        remaining-=count;
      }
      return value;
    }
    function exactExpected(config,armorConfig,mainHit,pool,column,slots){
      const counts=new Map();
      pool.forEach(region=>counts.set(region,(counts.get(region)||0)+1));
      const regions=[...counts.keys()], positions=[], shotCounts=new Map(), shotPatterns=new Map();
      let total=0, minShots=Infinity, minCount=0, minPattern=[];
      const record=(assignment)=>{
        const sequence=Array(slots).fill(mainHit);
        assignment.forEach((region,index)=>{ sequence[positions[index]]=region; });
        const trace=simulate(config,armorConfig,sequence,mainHit,column,true);
        if(positions.some(position=>position>=trace.shotsUsed)) return;
        const shots=trace.shots;
        total++;
        shotCounts.set(shots,(shotCounts.get(shots)||0)+1);
        const pattern=positions.map((position,index)=>({position,region:assignment[index],armorBreakIndex:trace.armorBreakIndex,killShotIndex:trace.shots-1,used:true}));
        if(!shotPatterns.has(shots)) shotPatterns.set(shots,pattern);
        if(shots<minShots){ minShots=shots; minCount=1; minPattern=pattern; }
        else if(shots===minShots) minCount++;
      };
      const assignRegions=(index,assignment)=>{
        if(index===pool.length){ record(assignment); return; }
        regions.forEach(region=>{
          const left=counts.get(region)||0;
          if(!left) return;
          counts.set(region,left-1);
          assignment.push(region);
          assignRegions(index+1,assignment);
          assignment.pop();
          counts.set(region,left);
        });
      };
      const choosePositions=(start)=>{
        if(positions.length===pool.length){ assignRegions(0,[]); return; }
        const remaining=pool.length-positions.length;
        for(let position=start;position<=slots-remaining;position++){
          positions.push(position);
          choosePositions(position+1);
          positions.pop();
        }
      };
      choosePositions(0);
      if(!total) throw new Error("当前随机命中组合无法计算，请减少随机命中枪数或调整命中部位");
      return {average:total?[...shotCounts].reduce((sum,[shots,count])=>sum+shots*count,0)/total:0,minShots,minCount,minPattern,shotCounts:Object.fromEntries(shotCounts),shotPatterns:Object.fromEntries(shotPatterns),sampleCount:total,exact:true};
    }
    function expected(config,armorConfig,mainHit,randomHits,column,seed,shotSlots,sampleTarget=SAMPLES){
      const estimate=simulate(config,armorConfig,[],mainHit,column);
      const slots=shotSlots??estimate;
      const pool=[]; Object.entries(randomHits).forEach(([r,count])=>{for(let i=0;i<count;i++)pool.push(r)});
      if(!pool.length) return {average:estimate,minShots:estimate,minCount:sampleTarget,minPattern:[],shotCounts:{[estimate]:sampleTarget},shotPatterns:{[estimate]:[]},sampleCount:sampleTarget,exact:true};
      if(pool.length>slots) throw new Error("当前随机命中组合无法计算，请减少随机命中枪数或调整命中部位");
      if(exactPatternCount(slots,pool)<=EXACT_ENUMERATION_LIMIT) return exactExpected(config,armorConfig,mainHit,pool,column,slots);
      const rng=seeded(seed); let total=0, minShots=Infinity, minCount=0, minPattern=[], accepted=0, attempts=0, shotCounts=new Map(), shotPatterns=new Map();
      const validationAttempts=sampleTarget*100, minimumValidSamples=Math.min(1000,Math.ceil(sampleTarget*.25));
      while(accepted<sampleTarget){
        if(attempts===validationAttempts&&accepted<minimumValidSamples) throw new Error("当前随机命中组合无法计算，请减少随机命中枪数或调整命中部位");
        attempts++;
        const positions=shuffle([...Array(slots).keys()],rng).slice(0,pool.length).sort((a,b)=>a-b);
        const hits=shuffle([...pool],rng); const sequence=Array(slots).fill(mainHit);
        positions.forEach((p,i)=>sequence[p]=hits[i]);
        const trace=simulate(config,armorConfig,sequence,mainHit,column,true);
        if(positions.some(position=>position>=trace.shotsUsed)) continue;
        accepted++;
        const shots=trace.shots;
        total+=shots;
        shotCounts.set(shots,(shotCounts.get(shots)||0)+1);
        if(!shotPatterns.has(shots)) shotPatterns.set(shots,positions.map((position,i)=>({position,region:hits[i],armorBreakIndex:trace.armorBreakIndex,killShotIndex:trace.shots-1,used:true})));
        if(shots<minShots){
          minShots=shots; minCount=1;
          minPattern=positions.map((position,i)=>({position,region:hits[i],armorBreakIndex:trace.armorBreakIndex,killShotIndex:trace.shots-1,used:true}));
        }
        else if(shots===minShots) minCount++;
      }
      return {average:total/accepted,minShots,minCount,minPattern,shotCounts:Object.fromEntries(shotCounts),shotPatterns:Object.fromEntries(shotPatterns),sampleCount:accepted,exact:false};
    }
    function columnCanAffectHits(column,mainHit,randomHits){
      if(column.name==="无词条"||column.armorBreak||column.flesh) return true;
      const hitRegions=new Set([mainHit,...Object.entries(randomHits).filter(([,count])=>count>0).map(([region])=>region)]);
      return column.effects.some(effect=>[...hitRegions].some(region=>effectMultiplier(effect,region,"究")!==1));
    }
    function sharedShotSlots(config,armorConfig,mainHit,columns,randomHits){
      const randomCount=Object.values(randomHits).reduce((sum,count)=>sum+count,0);
      const baseSlots=Math.max(...columns.map(column=>simulate(config,armorConfig,[],mainHit,column)));
      return baseSlots+randomCount;
    }
