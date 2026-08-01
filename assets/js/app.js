    const HEALTH = 100, ARMOR_PER_PLATE = 50, SAMPLES = 5000, RANKING_SAMPLES = 100;
    const levels = { 紫: 0, 橙: 1, 红: 2, 究: 3 };
    const qualityMultipliers = { "-3": .5, "-2": .7, "-1": .85, "0": 1, "1": 1.1, "2": 1.2, "3": 1.3 };
    const armors = [
      {quality:"紫",plates:1,armorType:"全包"}, {quality:"紫",plates:2,armorType:"半包"}, {quality:"紫",plates:3,armorType:"躯干"},
      {quality:"橙",plates:2,armorType:"全包"}, {quality:"橙",plates:3,armorType:"半包"},
      {quality:"红",plates:3,armorType:"全包"}, {quality:"红",plates:4,armorType:"半包"},
      {quality:"究",plates:3,armorType:"全包",variant:"β",health:200},
      {quality:"究",plates:4,armorType:"全包",variant:"γ / δ"},
      {quality:"究",plates:4,armorType:"全包",variant:"黑曜石",immuneFirstShot:true},
      {quality:"究",plates:6,armorType:"全包",variant:"α"}
    ];
    const regionLabels = { upper_chest:"上胸", abdomen:"腹部", head:"头部", upper_arm:"上臂", lower_arm:"下臂", legs:"腿部" };
    const sceneLabels = { lower_arm:"下臂 / 正面对枪", upper_arm:"上臂 / 侧面偷袭", upper_chest:"上胸 / 背面偷袭", head:"头部 / 掩体对狙", legs:"腿部 / 专业修脚" };
    const randomPresets = {
      normal:{lower_arm:0,upper_arm:0,upper_chest:2,abdomen:0,legs:0,head:0},
      crouch:{lower_arm:0,upper_arm:0,upper_chest:0,abdomen:1,legs:2,head:0},
      headshot:{lower_arm:0,upper_arm:0,upper_chest:1,abdomen:0,legs:0,head:1},
      tapfire:{lower_arm:0,upper_arm:1,upper_chest:1,abdomen:0,legs:0,head:0},
      custom:{lower_arm:0,upper_arm:0,upper_chest:0,abdomen:0,legs:0,head:0}
    };
    const affixes = {
      1:["上半0.2","upper_body"], 2:["躯干0.2","torso"], 3:["手臂0.2","arms"], 4:["头部0.3","head03"],
      5:["头部0.5","head05"], 6:["腿部0.2","legs"], 7:["破甲","armorBreak"], 8:["肉伤","flesh"]
    };
    const combinations = [[1,2],[1,3],[1,4],[1,6],[1,7],[1,8],[2,5],[3,5],[4,5],[6,5],[2,7],[2,8],[3,7],[3,8],[4,7],[4,8],[7,8]];
    const makeColumn = nums => ({
      name: nums.map(n => affixes[n][0]).join("+"),
      effects: nums.map(n => affixes[n][1]).filter(x => !["armorBreak","flesh"].includes(x)),
      armorBreak: nums.includes(7), flesh: nums.includes(8)
    });
    const singleColumns = Object.keys(affixes).map(n=>makeColumn([+n]));
    const doubleColumns = combinations.map(makeColumn);
    function qualityColumnName(name,quality){
      if(quality!=="橙") return name;
      return name
        .replaceAll("上半0.2","上半0.1")
        .replaceAll("躯干0.2","躯干0.1")
        .replaceAll("手臂0.2","手臂0.1")
        .replaceAll("腿部0.2","腿部0.1")
        .replaceAll("头部0.3","头部0.1")
        .replaceAll("头部0.5","头部0.3");
    }
    function columnsForQuality(columns,quality){
      return columns.map(column=>({...column,name:qualityColumnName(column.name,quality)}));
    }
    function activeColumns(){
      const quality=document.querySelector("#gunQuality").value;
      const noAffix={name:"无词条",effects:[],armorBreak:false,flesh:false};
      if(quality==="紫") return [noAffix];
      if(quality==="橙" && affixMode!=="single") return [noAffix, ...columnsForQuality(singleColumns,quality)];
      if(affixMode==="compare") return [];
      if(affixMode==="double") return columnsForQuality(doubleColumns,quality);
      return [noAffix, ...columnsForQuality(singleColumns,quality)];
    }

    const randomInputs = document.querySelector("#randomInputs");
    Object.entries(regionLabels).forEach(([key,label]) => randomInputs.insertAdjacentHTML("beforeend", `<label class="random-grid"><span>${label}</span><select data-random="${key}"><option${key==="upper_chest"?"":" selected"}>0</option><option${key==="upper_chest"?" selected":""}>1</option><option>2</option></select></label>`));

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

    let weapons = BUILT_IN_WEAPONS;
    let weaponConfig = validateWeapon(BUILT_IN_WEAPONS[0]);
    let lastResults = [];
    let renderedColumns = [];
    let excludedColumns = [];
    let viewMode = "best";
    let viewAfterRender = null;
    let metricMode = "shots";
    let rankingResults = [];
    let rankingAffixMode = "single";
    let affixMode = "single";
    let curveAffixName = "无词条";
    let curveResizeFrame = 0;
    const CURVE_QUALITY_COLORS = {紫:"#9085e9",橙:"#c97832",红:"#c84c91",究:"#c98500"};
    const CURVE_SATURATION_FACTORS = [1,.68,.38,.16];
    const CURVE_DASHES = ["","7 3","3 3","10 3 2 3","2 3","8 2","5 2 1 2","1 3","9 4","4 4","12 3"];
    const CURVE_ARMOR_GROUPS = [
      {quality:"紫",label:"紫甲"},
      {quality:"橙",label:"橙甲"},
      {quality:"红",label:"红甲"},
      {quality:"究",label:"究甲"}
    ];

    function curveSaturationColor(hex,factor){
      const value=hex.replace("#","");
      const r=parseInt(value.slice(0,2),16)/255, g=parseInt(value.slice(2,4),16)/255, b=parseInt(value.slice(4,6),16)/255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b), lightness=(max+min)/2, delta=max-min;
      let hue=0, saturation=0;
      if(delta){
        saturation=delta/(1-Math.abs(2*lightness-1));
        if(max===r) hue=60*(((g-b)/delta)%6);
        else if(max===g) hue=60*((b-r)/delta+2);
        else hue=60*((r-g)/delta+4);
      }
      if(hue<0) hue+=360;
      return `hsl(${hue.toFixed(1)} ${Math.max(12,saturation*factor*100).toFixed(1)}% ${(lightness*100).toFixed(1)}%)`;
    }

    function curveColumnsForQuality(quality){
      const noAffix={name:"无词条",effects:[],armorBreak:false,flesh:false};
      if(quality==="紫") return [noAffix];
      const singles=columnsForQuality(singleColumns,quality);
      return quality==="橙"?[noAffix,...singles]:[noAffix,...singles,...columnsForQuality(doubleColumns,quality)];
    }
    function syncCurveAffixOptions(){
      const quality=document.querySelector("#gunQuality").value, select=document.querySelector("#curveAffixSelect");
      const columns=curveColumnsForQuality(quality);
      if(!columns.some(column=>column.name===curveAffixName)) curveAffixName=columns[0].name;
      select.replaceChildren(...columns.map(column=>new Option(formatAffixName(column.name),column.name)));
      select.value=curveAffixName;
    }
    function curveColumn(){
      return curveColumnsForQuality(document.querySelector("#gunQuality").value).find(column=>column.name===curveAffixName)||curveColumnsForQuality(document.querySelector("#gunQuality").value)[0];
    }
    function curveArmorLabel(armor){ return `${armor.quality}甲 ${armor.plates}格${armor.variant?` ${armor.variant}`:""}`; }
    function curveSeries(){
      const quality=document.querySelector("#gunQuality").value, mainHit=document.querySelector("#mainHit").value, random=randomHits(), column=curveColumn();
      return armors.map((armorConfig,index)=>{
        const group=CURVE_ARMOR_GROUPS.find(item=>item.quality===armorConfig.quality)||CURVE_ARMOR_GROUPS[0];
        const groupMembers=armors.filter(armor=>armor.quality===armorConfig.quality), memberIndex=groupMembers.indexOf(armorConfig);
        return {
          index,
          priority:index,
          armor:armorConfig,
          label:curveArmorLabel(armorConfig),
          color:curveSaturationColor(CURVE_QUALITY_COLORS[armorConfig.quality],CURVE_SATURATION_FACTORS[memberIndex]??.34),
          dash:CURVE_DASHES[memberIndex]||`${2+memberIndex} 3`,
          groupLabel:group.label,
          points:weaponConfig.damageRanges.map(range=>{
            const cfg={...weaponConfig,quality,damage:+range.damage};
            const slots=sharedShotSlots(cfg,armorConfig,mainHit,[column],random);
            const result=expected(cfg,armorConfig,mainHit,random,column,20260728+index,slots);
            const plan=recommendationPlan([result],[0]);
            const shots=plan.targetShots;
            return {min:range.min,max:range.max,shots,value:metricMode==="ttk"?(shots-1)*weaponConfig.shotIntervalMs:shots};
          })
        };
      });
    }
    function curveValueAt(series,distance){
      return series.points.find(point=>distance>=point.min&&distance<point.max)||series.points[series.points.length-1];
    }
    function drawCurveChart(){
      if(affixMode!=="curve"||metricMode==="ranking") return;
      syncCurveAffixOptions();
      const wrap=document.querySelector("#curveChartWrap"), svg=document.querySelector("#rangeCurveChart"), tooltip=document.querySelector("#curveTooltip");
      const width=Math.max(640,wrap.clientWidth||900), height=Math.max(360,wrap.clientHeight||430), margin={top:22,right:28,bottom:46,left:62};
      const series=curveSeries(), maxDistance=Math.max(...weaponConfig.damageRanges.map(range=>range.max));
      const visualRank=index=>index-(series.length-1)/2;
      const horizontalOffset=()=>metricMode==="ttk"?Math.max(4,weaponConfig.shotIntervalMs*.06):.12;
      const transitionOffset=index=>index*1.2;
      const transitionSlope=index=>3+index*.25;
      const horizontalOverlapRank=(series,index,pointIndex)=>{
        const peers=series.filter(item=>item.points[pointIndex]?.value===series[index].points[pointIndex]?.value);
        return peers.length>1?peers.indexOf(series[index]):0;
      };
      const transitionOverlapRank=(series,index,boundaryIndex)=>{
        const peers=series.filter(item=>item.points[boundaryIndex]?.value!==item.points[boundaryIndex+1]?.value);
        return peers.length>1?peers.indexOf(series[index]):-1;
      };
      const pointOffset=(series,index,pointIndex)=>horizontalOverlapRank(series,index,pointIndex)*horizontalOffset();
      const rawValues=series.flatMap(item=>item.points.map(point=>point.value));
      const visualValues=series.flatMap(item=>item.points.map((point,index)=>point.value+pointOffset(series,item.index,index)));
      const minValue=Math.min(...visualValues), maxValue=Math.max(...visualValues), yPadding=Math.max(metricMode==="ttk"?weaponConfig.shotIntervalMs:.5,(maxValue-minValue)*.12);
      const yMin=Math.max(0,minValue-yPadding), yMax=maxValue+yPadding, x=distance=>margin.left+distance/maxDistance*(width-margin.left-margin.right), y=value=>margin.top+(yMax-value)/(yMax-yMin)*(height-margin.top-margin.bottom);
      const yBreaks=[...new Set(rawValues)].sort((a,b)=>a-b);
      const formatCurveAxisValue=value=>metricMode==="shots"?String(Math.round(value)):(Number.isInteger(value)?String(value):value.toFixed(1));
      const turningDistances=weaponConfig.damageRanges.slice(0,-1).map((range,index)=>series.some(item=>item.points[index]?.value!==item.points[index+1]?.value)?range.max:null).filter(value=>value!==null);
      const xBreaks=[...new Set([0,...turningDistances,maxDistance])].sort((a,b)=>a-b), pieces=[];
      yBreaks.forEach(value=>{
        const py=y(value);
        pieces.push(`<line class="curve-grid" x1="${margin.left}" y1="${py}" x2="${width-margin.right}" y2="${py}"/><text class="curve-label" x="${margin.left-9}" y="${py+3}" text-anchor="end">${formatCurveAxisValue(value)}</text>`);
      });
      xBreaks.forEach(value=>{
        const px=x(value);
        pieces.push(`<line class="curve-grid" x1="${px}" y1="${margin.top}" x2="${px}" y2="${height-margin.bottom}"/><text class="curve-label" x="${px}" y="${height-margin.bottom+19}" text-anchor="middle">${Number(value.toFixed(1))}</text>`);
      });
      pieces.push(`<line class="curve-axis" x1="${margin.left}" y1="${height-margin.bottom}" x2="${width-margin.right}" y2="${height-margin.bottom}"/><line class="curve-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height-margin.bottom}"/><text class="curve-label" x="${(margin.left+width-margin.right)/2}" y="${height-10}" text-anchor="middle">射程（米）</text><text class="curve-label" transform="translate(15 ${(margin.top+height-margin.bottom)/2}) rotate(-90)" text-anchor="middle">${metricMode==="ttk"?"TTK（ms）":"击杀枪数"}</text>`);
      series.forEach(item=>{
        const coordinates=[];
        item.points.forEach((point,index)=>{
          const startX=x(point.min), endX=x(point.max), pointY=y(point.value+pointOffset(series,item.index,index));
          if(!index) coordinates.push([startX,pointY]);
          else {
            const previousY=coordinates[coordinates.length-1][1], overlapRank=transitionOverlapRank(series,item.index,index-1);
            if(overlapRank<0) coordinates.push([startX,previousY],[startX,pointY]);
            else {
              const center=startX+transitionOffset(overlapRank), half=transitionSlope(overlapRank)/2;
              coordinates.push([Math.max(coordinates[coordinates.length-1][0],center-half),previousY],[Math.min(endX,center+half),pointY]);
            }
          }
          coordinates.push([endX,pointY]);
        });
        const d=coordinates.map((point,index)=>`${index?"L":"M"}${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(" ");
        const dash=item.dash?` stroke-dasharray="${item.dash}"`:"";
        pieces.push(`<path class="curve-line" data-series="${item.index}" d="${d}" stroke="${item.color}"${dash}/><path class="curve-hit" data-series="${item.index}" d="${d}"/><circle class="curve-focus" data-focus="${item.index}" cx="0" cy="0" r="4" stroke="${item.color}" style="display:none"/>`);
      });
      pieces.push(`<line class="curve-crosshair" id="curveCrosshair" x1="0" y1="${margin.top}" x2="0" y2="${height-margin.bottom}"/>`);
      svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
      svg.innerHTML=pieces.join("");
      document.querySelector("#curveLegend").innerHTML=series.map(item=>`<span class="curve-legend-item"><span class="curve-legend-line" style="--series-color:${item.color};background:${item.color};${item.dash?`border-top:1px dashed ${item.color};height:1px;background:transparent`:""}"></span>${item.label}</span>`).join("");
      document.querySelector("#curveDataTable").innerHTML=`<table><thead><tr><th>护甲</th>${weaponConfig.damageRanges.map(range=>`<th>${range.min}–${range.max} 米</th>`).join("")}</tr></thead><tbody>${series.map(item=>`<tr><td>${item.label}</td>${item.points.map(point=>`<td>${metricMode==="ttk"?`${Number.isInteger(point.value)?point.value:point.value.toFixed(1)} ms`:`${point.shots} 枪`}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      const showTooltip=event=>{
        const bounds=svg.getBoundingClientRect(), localX=(event.clientX-bounds.left)/bounds.width*width, distance=Math.max(0,Math.min(maxDistance,(localX-margin.left)/(width-margin.left-margin.right)*maxDistance));
        const px=x(distance), crosshair=svg.querySelector("#curveCrosshair");
        crosshair.style.display="block"; crosshair.setAttribute("x1",px); crosshair.setAttribute("x2",px);
        const rows=series.map(item=>{
          const point=curveValueAt(item,distance), pointIndex=item.points.indexOf(point), py=y(point.value+pointOffset(series,item.index,pointIndex)), focus=svg.querySelector(`[data-focus="${item.index}"]`);
          focus.style.display="block"; focus.setAttribute("cx",px); focus.setAttribute("cy",py);
          return `<span class="curve-tooltip-row"><span class="curve-tooltip-key" style="--series-color:${item.color}"></span><span>${item.label}</span><span class="curve-tooltip-value">${metricMode==="ttk"?`${Number.isInteger(point.value)?point.value:point.value.toFixed(1)} ms`:`${point.shots} 枪`}</span></span>`;
        }).join("");
        tooltip.innerHTML=`<strong>${distance.toFixed(1)} 米 · ${formatAffixName(curveAffixName)}</strong>${rows}`;
        tooltip.style.display="block";
        tooltip.style.left=`${Math.min(wrap.clientWidth-tooltip.offsetWidth-8,Math.max(8,event.clientX-wrap.getBoundingClientRect().left+14))}px`;
        tooltip.style.top=`${Math.max(8,event.clientY-wrap.getBoundingClientRect().top-tooltip.offsetHeight-10)}px`;
      };
      svg.onpointermove=showTooltip;
      svg.onpointerleave=()=>{
        tooltip.style.display="none";
        svg.querySelector("#curveCrosshair").style.display="none";
        svg.querySelectorAll("[data-focus]").forEach(node=>node.style.display="none");
      };
    }

    function validateWeapon(weapon){
      const regions=["head","upper_chest","abdomen","upper_arm","lower_arm","legs"];
      const shotInterval=Number(weapon?.shot_interval_ms);
      const projectiles=weapon?.projectiles_per_shot===undefined?1:Number(weapon.projectiles_per_shot);
      const builtInFleshRatio=weapon?.built_in_flesh_ratio===undefined?0:Number(weapon.built_in_flesh_ratio);
      const unarmoredDamageMultiplier=weapon?.unarmored_damage_multiplier===undefined?1:Number(weapon.unarmored_damage_multiplier);
      if(!weapon || typeof weapon.name!=="string" || !weapon.name.trim() || !Number.isFinite(shotInterval) || shotInterval<=0) throw new Error("枪械 JSON 的名称或射击间隔无效");
      if(!Number.isInteger(projectiles)||projectiles<1) throw new Error("枪械 JSON 的每次开火弹丸数必须是大于等于 1 的整数");
      if(!Number.isFinite(builtInFleshRatio)||builtInFleshRatio<0||builtInFleshRatio>1) throw new Error("枪械 JSON 的自带肉伤比例必须在 0 到 1 之间");
      if(!Number.isFinite(unarmoredDamageMultiplier)||unarmoredDamageMultiplier<=0) throw new Error("枪械 JSON 的无甲伤害倍率必须是正数");
      if(!weapon.region_multipliers || regions.some(r=>!Number.isFinite(Number(weapon.region_multipliers[r]))||Number(weapon.region_multipliers[r])<=0)) throw new Error("枪械 JSON 缺少有效的部位倍率");
      const damageRanges=weapon.damage_ranges;
      if(!Array.isArray(damageRanges)||!damageRanges.length) throw new Error("枪械 JSON 缺少射程伤害配置");
      if(damageRanges.some(range=>!Number.isFinite(Number(range.min))||!Number.isFinite(Number(range.max))||!Number.isFinite(Number(range.damage))||Number(range.min)<0||Number(range.max)<=Number(range.min)||Number(range.damage)<=0)) throw new Error("枪械 JSON 的射程伤害配置无效");
      return { name:weapon.name.trim(), shotIntervalMs:shotInterval, projectilesPerShot:projectiles, builtInFleshRatio, unarmoredDamageMultiplier, damageRanges:damageRanges.map(range=>({min:Number(range.min),max:Number(range.max),damage:Number(range.damage)})), multipliers:Object.fromEntries(regions.map(r=>[r,Number(weapon.region_multipliers[r])])) };
    }
    function rangeLabel(range){
      const end=range.max;
      return `约 ${range.min} – ${end} 米 · ${range.damage} 伤害`;
    }
    function updateDamageRanges(){
      const select=document.querySelector("#damageRange");
      select.replaceChildren(...weaponConfig.damageRanges.map((range,index)=>new Option(rangeLabel(range),String(index))));
    }
    function setWeapon(weapon){
      weaponConfig=validateWeapon(weapon);
      const quality=document.querySelector("#gunQuality").value;
      document.querySelector("#weaponSummary").textContent=`${weaponConfig.name} · ${quality}`;
      updateDamageRanges();
      if(affixMode==="curve") syncCurveAffixOptions();
    }
    function isUltimateWeapon(name){
      if(name.includes("无究极")||name.includes("无弹匣")||name.includes("单点")||name.includes("倍率枪管")) return false;
      return name.includes("究极")||name.includes("射程枪管")||name.includes("全自动");
    }
    function weaponOption(item){
      const button=document.createElement("button");
      button.type="button";
      button.className="weapon-select-option";
      button.dataset.value=String(item.index);
      button.setAttribute("role","option");
      button.textContent=item.config.name;
      button.title=item.config.name;
      return button;
    }
    function weaponGroup(title,items){
      const group=document.createElement("div");
      group.className="weapon-select-group";
      const heading=document.createElement("span");
      heading.className="weapon-select-group-title";
      heading.textContent=title;
      group.append(heading,...items.map(weaponOption));
      return group;
    }
    function populateWeapons(items){
      const validated=items.map((weapon,index)=>{
        try { return {raw:weapon,config:validateWeapon(weapon),index}; }
        catch(error){ throw new Error(`第 ${index+1} 个枪械配置无效：${error.message}`); }
      });
      weapons=validated.map(item=>item.raw);
      const select=document.querySelector("#weaponSelect");
      select.replaceChildren(...validated.map(item=>new Option(item.config.name,String(item.index))));
      const selectedIndex=Math.min(+select.dataset.selectedIndex||0,weapons.length-1);
      select.value=String(selectedIndex);
      const menu=document.querySelector("#weaponSelectMenu");
      menu.replaceChildren(
        weaponGroup("带究极配件",validated.filter(item=>isUltimateWeapon(item.config.name))),
        weaponGroup("不带究极配件",validated.filter(item=>!isUltimateWeapon(item.config.name)))
      );
      syncWeaponPicker(selectedIndex);
      setWeapon(weapons[selectedIndex]);
      applyWeaponQualityLimit();
    }
    async function loadWeapons(){
      // 回退数据脚本已内置完整枪械配置，双击打开时无需读取外部文件。
      if(location.protocol==="file:") return;
      try {
        const response=await fetch("weapons.json", {cache:"no-store"});
        if(!response.ok) throw new Error();
        const items=await response.json();
        if(!Array.isArray(items)||!items.length) throw new Error();
        const select=document.querySelector("#weaponSelect");
        select.dataset.selectedIndex=select.value;
        populateWeapons(items);
        render();
      } catch {
        // 保留已经内置并渲染的完整枪械数据。
      }
    }
    function applyRecommendedPreset(){
      const weaponName=weaponConfig.name;
      let mainHit="upper_chest", preset="tapfire";
      if(weaponName.startsWith("Fennec")||weaponName.startsWith("Type19")||weaponName.startsWith("J358")||weaponName==="拉克曼556 (究极弹匣)"){
        mainHit="lower_arm";
        preset=weaponName==="Type19 (单点)"?"tapfire":"normal";
      }
      if(weaponName==="USS9 (究极弹匣)"){
        mainHit="legs";
        preset="custom";
      }
      if(weaponName==="ISO"){
        mainHit="upper_chest";
        preset="tapfire";
      }
      document.querySelector("#mainHit").value=mainHit;
      document.querySelector("#randomPreset").value=preset;
      applyRandomPreset(preset);
    }
    document.querySelector("#recommendPreset").addEventListener("click",()=>{
      applyRecommendedPreset();
      autoRender();
    });

    function applyWeaponQualityLimit(){
      const qualitySelect=document.querySelector("#gunQuality");
      const j358=weaponConfig.name.startsWith("J358"), uss9=weaponConfig.name.startsWith("USS9");
      [...qualitySelect.options].forEach(option=>option.disabled=(j358&&["红","究"].includes(option.value))||(uss9&&option.value==="究"));
      if(j358&&["红","究"].includes(qualitySelect.value)) qualitySelect.value="橙";
      if(uss9&&qualitySelect.value==="究") qualitySelect.value="红";
      updateAffixAvailability();
    }
    function syncWeaponPicker(index){
      const select=document.querySelector("#weaponSelect");
      select.value=String(index);
      document.querySelector("#weaponSelectTrigger").textContent=weapons[index]?.name||"选择枪械";
      document.querySelectorAll(".weapon-select-option").forEach(option=>{
        const active=+option.dataset.value===index;
        option.classList.toggle("active",active);
        option.setAttribute("aria-selected",String(active));
      });
    }
    function closeWeaponPicker(){
      document.querySelector("#weaponSelectRow").classList.remove("open");
      document.querySelector("#weaponSelectTrigger").setAttribute("aria-expanded","false");
    }
    function selectWeapon(index){
      if(!Number.isInteger(index)||!weapons[index]) return;
      const select=document.querySelector("#weaponSelect");
      select.dataset.selectedIndex=String(index);
      syncWeaponPicker(index);
      closeWeaponPicker();
      setWeapon(weapons[index]);
      applyWeaponQualityLimit();
      applyRecommendedPreset();
      autoRender();
    }
    document.querySelector("#weaponSelectTrigger").addEventListener("click",()=>{
      const row=document.querySelector("#weaponSelectRow"), open=!row.classList.contains("open");
      row.classList.toggle("open",open);
      document.querySelector("#weaponSelectTrigger").setAttribute("aria-expanded",String(open));
      if(open) document.querySelector(".weapon-select-option.active")?.scrollIntoView({block:"nearest"});
    });
    document.querySelector("#weaponSelectMenu").addEventListener("click",event=>{
      const option=event.target.closest(".weapon-select-option");
      if(option) selectWeapon(+option.dataset.value);
    });
    document.addEventListener("click",event=>{
      if(!event.target.closest("#weaponSelectRow")) closeWeaponPicker();
    });

    function updateAffixAvailability(){
      const quality=document.querySelector("#gunQuality").value;
      if(metricMode==="ranking"){
        if(quality==="紫") rankingAffixMode="none";
        else if(quality==="橙"&&rankingAffixMode==="double") rankingAffixMode="single";
        const buttonIds={none:"singleAffix",single:"doubleAffix",double:"compareAffix"};
        Object.values(buttonIds).forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[rankingAffixMode]));
        document.querySelector("#singleAffix").disabled=false;
        document.querySelector("#doubleAffix").disabled=quality==="紫";
        document.querySelector("#compareAffix").disabled=["紫","橙"].includes(quality);
        document.querySelector("#curveAffix").hidden=true;
        document.querySelector("#curveHelpWrap").hidden=true;
        document.querySelector("#curveAffix").disabled=true;
        return;
      }
      const orange=quality==="橙", purple=quality==="紫";
      document.querySelector("#curveAffix").hidden=false;
      document.querySelector("#curveHelpWrap").hidden=false;
      document.querySelector("#curveAffix").disabled=false;
      document.querySelector("#doubleAffix").disabled=orange||purple;
      document.querySelector("#compareAffix").disabled=orange||purple;
      document.querySelector("#singleAffix").disabled=purple;
      document.querySelector("#curveAffix").disabled=false;
      if((orange||purple)&&!["single","curve"].includes(affixMode)) affixMode="single";
      const buttonIds={single:"singleAffix",double:"doubleAffix",compare:"compareAffix",curve:"curveAffix"};
      Object.values(buttonIds).forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[affixMode]));
      if(affixMode==="curve") syncCurveAffixOptions();
    }

    let autoRenderTimer = 0;
    function autoRender(){
      if(!document.querySelector("#autoCalculate").checked) return;
      clearTimeout(autoRenderTimer);
      autoRenderTimer=setTimeout(render,500);
    }

    document.querySelector("#damageRange").addEventListener("change",autoRender);
    document.querySelector("#gunQuality").addEventListener("change",()=>{
      updateAffixAvailability();
      document.querySelector("#weaponSummary").textContent=`${weaponConfig.name} · ${document.querySelector("#gunQuality").value}`;
      autoRender();
    });

    function applyRandomPreset(presetName){
      const preset=randomPresets[presetName];
      document.querySelectorAll("[data-random]").forEach(select=>{
        select.disabled=false;
        select.value=String(preset[select.dataset.random]);
      });
    }
    document.querySelector("#mainHit").addEventListener("change",autoRender);
    document.querySelector("#randomPreset").addEventListener("change",event=>{
      applyRandomPreset(event.target.value);
      autoRender();
    });
    document.querySelectorAll("[data-random]").forEach(select=>select.addEventListener("change",()=>{
      document.querySelector("#randomPreset").value="custom";
      autoRender();
    }));

    function randomHits(){ return Object.fromEntries([...document.querySelectorAll("[data-random]")].map(el=>[el.dataset.random,+el.value])); }
    function armorClass(q){return {紫:"purple",橙:"orange",红:"red",究:"gold"}[q]}

    function displayMetricValue(result){
      return metricMode==="shots"?Math.ceil(result.average):(Math.ceil(result.average)-1)*weaponConfig.shotIntervalMs;
    }
    function formatMetric(value){
      return metricMode==="shots"?`${value}枪`:`${Number.isInteger(value)?value:value.toFixed(1)}ms`;
    }
    function formatResult(result){ return formatMetric(displayMetricValue(result)); }
    function strictMetricValue(result){
      return metricMode==="shots"?result.minShots:(result.minShots-1)*weaponConfig.shotIntervalMs;
    }
    function formatTargetResult(shots){
      return formatMetric(metricMode==="shots"?shots:(shots-1)*weaponConfig.shotIntervalMs);
    }
    function formatStrictResult(result){ return formatMetric(strictMetricValue(result)); }
    function patternText(pattern,difference=0){
      const usedHits=pattern?.filter(hit=>hit.used)||[];
      if(!usedHits.length) return "";
      const relevant=difference>0
        ?usedHits.filter(hit=>hit.position===hit.killShotIndex)
        :difference<0?usedHits.filter(hit=>hit.armorBreakIndex<0||hit.position<hit.armorBreakIndex):[];
      if(relevant.length){
        const groups=new Map();
        relevant.forEach(({region})=>groups.set(region,(groups.get(region)||0)+1));
        const [region,count]=[...groups].sort((a,b)=>b[1]-a[1])[0];
        return difference>0
          ?`例如：至少 ${count} 枪 ${regionLabels[region]} 最后一枪才命中，伤害溢出`
          :`例如：至少 ${count} 枪 ${regionLabels[region]} 在破甲前就命中，吃到倍率`;
      }
      const groups=new Map();
      usedHits.forEach(({position,region,armorBreakIndex,killShotIndex})=>{
        const cause=position===killShotIndex?"last":position===armorBreakIndex?"break":"before";
        const key=`${cause}|${region}`;
        groups.set(key,(groups.get(key)||0)+1);
      });
      return [...groups].map(([key,count])=>{
        const [cause,region]=key.split("|");
        if(cause==="last") return `${count} 枪${regionLabels[region]}拖到最后一枪才命中`;
        return `${cause==="break"?"破甲时":"破甲前"}命中 ${count} 枪${regionLabels[region]}`;
      }).join("、");
    }
    function formatChancePercent(result,shots){
      const count=result.shotCounts?.[shots]||0;
      if(count===0) return "0";
      const totalSamples=result.sampleCount||SAMPLES;
      if(count===totalSamples) return "100";
      const rounded=Number((count/totalSamples*100).toFixed(1));
      return String(Math.min(99.9,Math.max(.1,rounded)));
    }
    function shotChance(result,shots){ return (result.shotCounts?.[shots]||0)/(result.sampleCount||SAMPLES); }
    function probabilityMetric(shots){
      const value=metricMode==="shots"?shots:(shots-1)*weaponConfig.shotIntervalMs;
      return `<span class="probability-metric">${value}</span>${metricMode==="shots"?" 枪":" ms"}`;
    }
    function probabilityDifference(difference){
      const value=metricMode==="shots"?Math.abs(difference):Math.abs(difference)*weaponConfig.shotIntervalMs;
      return `<span class="probability-metric">${value}</span>${metricMode==="shots"?" 枪":" ms"}`;
    }
    function shotNoteParts(result,shots,targetShots){
      const chance=formatChancePercent(result,shots);
      const difference=shots-targetShots;
      const direction=difference>0?"多":"少";
      return {text:`${chance}% 概率在 ${probabilityMetric(targetShots)}基础上${direction} ${probabilityDifference(difference)}`,pattern:patternText(result.shotPatterns?.[shots],difference)};
    }
    function shotNote(result,shots,targetShots){
      const {text,pattern}=shotNoteParts(result,shots,targetShots);
      return `${text}${pattern?`（如：${pattern}）`:""}`;
    }
    function reasonMarker(pattern){
      return pattern?`<span class="reason-marker"><button class="reason-trigger" type="button" aria-label="查看原因" title="查看原因">?</button><span class="reason-bubble">${pattern}</span></span>`:"";
    }
    function allViewBaseline(result){
      return Object.keys(result.shotCounts||{})
        .map(Number)
        .filter(shots=>shotChance(result,shots)>0)
        .sort((a,b)=>(result.shotCounts[b]||0)-(result.shotCounts[a]||0)||a-b)[0];
    }
    function allViewNote(result,isRelevant){
      if(!isRelevant) return "";
      const outcomes=Object.keys(result.shotCounts||{}).map(Number).filter(shots=>shotChance(result,shots)>0);
      if(outcomes.length<2) return "";
      const baseline=allViewBaseline(result);
      return outcomes
        .filter(shots=>shots!==baseline)
        .sort((a,b)=>a-b)
        .map(shots=>{
          const noteClass=shots>baseline?"more":"less";
          const {text,pattern}=shotNoteParts(result,shots,baseline);
          return `<span class="probability-note"><span class="note-affixes ${noteClass}">${text}</span>${reasonMarker(pattern)}</span>`;
        })
        .join("");
    }
    function cumulativeShotChance(result,shots){
      const totalSamples=result.sampleCount||SAMPLES;
      return Object.entries(result.shotCounts||{}).reduce((sum,[shot,count])=>sum+(+shot<=shots?count:0),0)/totalSamples;
    }
    function recommendationPlan(results,eligibleIndexes=results.map((_,index)=>index)){
      const strictMin=Math.min(...eligibleIndexes.map(index=>results[index].minShots));
      const strictIndexes=eligibleIndexes.filter(index=>results[index].minShots===strictMin);
      const maxStrictChance=Math.max(...strictIndexes.map(index=>shotChance(results[index],strictMin)));
      let targetShots=maxStrictChance>=.5?strictMin:strictMin+1;
      const maxShots=Math.max(...eligibleIndexes.flatMap(index=>Object.keys(results[index].shotCounts||{}).map(Number)));
      let candidates=[];
      while(targetShots<=maxShots){
        candidates=eligibleIndexes.filter(index=>cumulativeShotChance(results[index],targetShots)>=.5);
        if(candidates.length) break;
        targetShots++;
      }
      const bestChance=Math.max(...candidates.map(index=>cumulativeShotChance(results[index],targetShots)));
      const recommended=candidates.filter(index=>Math.abs(cumulativeShotChance(results[index],targetShots)-bestChance)<1e-9);
      const recommendedSet=new Set(recommended);
      const unstable=candidates.filter(index=>!recommendedSet.has(index));
      const rare=recommended.filter(index=>results[index].minShots<targetShots);
      return {strictMin,targetShots,recommended,rare,unstable};
    }
    function uniqueIndexes(indexes){ return [...new Set(indexes)]; }
    function uniqueNames(names){ return [...new Set(names)]; }
    const AFFIX_DISPLAY_PRIORITY = { "无词条":0, "上半0.2":1, "上半0.1":1, "躯干0.2":2, "躯干0.1":2, "手臂0.2":3, "手臂0.1":3, "头部0.5":4, "头部0.3":5, "头部0.1":5, "腿部0.2":6, "腿部0.1":6, "破甲":7, "肉伤":8 };
    function sortAffixNames(names){ return [...names].sort((a,b)=>(AFFIX_DISPLAY_PRIORITY[a]||99)-(AFFIX_DISPLAY_PRIORITY[b]||99)); }
    function formatAffixName(name){ return name.split("+").join(" + "); }
    function groupOptimalNames(names){
      const remaining=names.map(name=>sortAffixNames(name.split("+")));
      const grouped=[];
      while(true){
        const counts=new Map();
        remaining.forEach(parts=>{
          if(parts.length<2) return;
          parts.forEach(part=>counts.set(part,(counts.get(part)||0)+1));
        });
        const common=[...counts].filter(([,count])=>count>=2).sort((a,b)=>(AFFIX_DISPLAY_PRIORITY[a[0]]||99)-(AFFIX_DISPLAY_PRIORITY[b[0]]||99)||b[1]-a[1])[0]?.[0];
        if(!common) break;
        const matches=remaining.filter(parts=>parts.includes(common));
        grouped.push({common,alternatives:sortAffixNames(matches.map(parts=>parts.filter(part=>part!==common).join(" + ")))});
        for(let i=remaining.length-1;i>=0;i--) if(remaining[i].includes(common)) remaining.splice(i,1);
      }
      return {grouped:grouped.sort((a,b)=>(AFFIX_DISPLAY_PRIORITY[a.common]||99)-(AFFIX_DISPLAY_PRIORITY[b.common]||99)),regular:remaining.map(parts=>parts.join(" + "))};
    }
    function optimalRow(items,classes=""){
      return `<span class="optimal-row count-${items.length}${classes?` ${classes}`:""}">${items.map((item,index)=>`<span class="optimal-affix${classes.includes("group-start")&&index===1?" plus":""}">${item}</span>`).join("")}</span>`;
    }
    function markProbability(text,marked){ return marked?`<span class="probability-affix">${text}</span>`:text; }
    function combinationInSet(common,alternative,names){
      return names.has(`${common}+${alternative}`)||names.has(`${alternative}+${common}`);
    }
    function probabilityEntries(name,result,targetShots,recommendation=false){
      return Object.keys(result.shotCounts||{})
        .map(Number)
        .filter(shots=>shots!==targetShots&&shotChance(result,shots)>0)
        .sort((a,b)=>a-b)
        .map(shots=>({name,result,shots,difference:shots-targetShots,recommendation}));
    }
    function groupProbabilityNotes(entries,targetShots){
      const groups=new Map();
      entries.forEach(({name,result,shots,difference,recommendation})=>{
        if(!result) return;
        const chance=formatChancePercent(result,shots);
        const direction=difference>0?"多":"少";
        const suffix=difference>0?(recommendation?"，劣于同等词条":"，但仍为最优解"):"，优于同等词条";
        const pattern=patternText(result.shotPatterns?.[shots],difference);
        const key=`${chance}|${direction}|${Math.abs(difference)}|${suffix}|${pattern}`;
        if(!groups.has(key)) groups.set(key,new Set());
        groups.get(key).add(formatAffixName(name));
      });
      const rows=[];
      groups.forEach((nameSet,key)=>{
        const names=[...nameSet];
        const [chance,direction,difference,suffix,pattern]=key.split("|");
        const noteClass=direction==="多"?"more":"less";
        const reason=reasonMarker(pattern);
        const lines=[];
        for(let i=0;i<names.length;i+=3) lines.push(names.slice(i,i+3));
        return lines.forEach((line,index)=>{
          const hasPrevious=index>0, hasNext=index<lines.length-1;
          const prefix=hasPrevious?'<span class="note-separator leading">/</span>':"";
          const lineNames=prefix+line.join('<span class="note-separator">/</span>');
          const detail=hasNext||line.length===3?"":`<span class="note-separator">：</span>${chance}% 概率在 ${probabilityMetric(targetShots)}基础上${direction} ${probabilityDifference(+difference)}${suffix}${reason}`;
          rows.push(`<span class="probability-note"><span class="note-affixes ${noteClass}">${lineNames}</span>${!hasNext&&line.length===3?'<span class="note-separator">：</span>':""}${detail}</span>`);
          if(!hasNext&&line.length===3) rows.push(`<span class="probability-note">${chance}% 概率在 ${probabilityMetric(targetShots)}基础上${direction} ${probabilityDifference(+difference)}${suffix}${reason}</span>`);
        });
      });
      return rows;
    }
    function widespreadAffixKey(name){ return sortAffixNames(name.split("+")).join("+"); }
    function widespreadAffixNames(rows,mode){
      const counts=new Map();
      const add=(name)=>{
        if(name==="无词条") return;
        const key=widespreadAffixKey(name);
        counts.set(key,(counts.get(key)||0)+1);
      };
      rows.forEach(row=>{
        if(mode==="singleCompare"){
          const plan=recommendationPlan(row.singleValues,row.singleEligible);
          uniqueIndexes(plan.recommended).forEach(index=>add(row.singleColumns[index].name));
          return;
        }
        if(mode==="doubleCompare"){
          const plan=recommendationPlan(row.doubleValues,row.doubleEligible);
          uniqueIndexes(plan.recommended).forEach(index=>add(row.doubleColumns[index].name));
          return;
        }
        const columns=renderedColumns.length?renderedColumns:activeColumns();
        const plan=recommendationPlan(row.values,row.eligibleIndexes);
        uniqueIndexes(plan.recommended).forEach(index=>add(columns[index].name));
      });
      const maxCount=Math.max(0,...counts.values());
      return new Set([...counts].filter(([,count])=>count===maxCount).map(([name])=>name));
    }
    function markWidespread(text,name,widespreadNames){
      return widespreadNames.has(widespreadAffixKey(name))?`<span class="widespread-affix">${text}</span>`:text;
    }
    function formatOptimalNames(names,rareNames=new Set(),resultsByName=new Map(),targetShots=0,unstableEntries=[],widespreadNames=new Set()){
      const displayNames=uniqueNames(names);
      const includesNoAffix=displayNames.includes("无词条");
      const sameLevelAffixes=displayNames.filter(name=>name!=="无词条"&&!rareNames.has(name));
      if(includesNoAffix&&sameLevelAffixes.length) return '<span class="optimal-affixes">无需词条，无负面即可</span>';
      const affixNames=displayNames.filter(name=>name!=="无词条");
      const {grouped,regular}=groupOptimalNames(affixNames), blocks=[], singleAffixes=includesNoAffix?["无词条"]:[];
      grouped.forEach(group=>{
        const commonRare=group.alternatives.some(alternative=>combinationInSet(group.common,alternative,rareNames));
        const commonWidespread=group.alternatives.some(alternative=>widespreadNames.has(widespreadAffixKey(`${group.common}+${alternative}`)));
        const commonText=markProbability(group.common,commonRare);
        const items=[`<span class="affix-common${commonWidespread?" widespread-affix":""}">${commonText}</span>`,...group.alternatives.map(alternative=>{
          const name=`${group.common}+${alternative}`;
          return markWidespread(markProbability(alternative,combinationInSet(group.common,alternative,rareNames)),name,widespreadNames);
        })];
        const rows=[];
        for(let i=0;i<items.length;i+=4) rows.push(optimalRow(items.slice(i,i+4),`sequence group${i?" continuation":" group-start"}`));
        blocks.push({priority:AFFIX_DISPLAY_PRIORITY[group.common]||99,html:rows.join("")});
      });
      regular.forEach(name=>{
        const parts=sortAffixNames(name.split(" + ")), compactName=name.replaceAll(" ",""), rare=rareNames.has(compactName);
        if(parts.length===2) blocks.push({priority:AFFIX_DISPLAY_PRIORITY[parts[0]]||99,html:optimalRow(parts.map(part=>markWidespread(markProbability(part,rare),compactName,widespreadNames)),"sequence pair")});
        else singleAffixes.push(name);
      });
      if(singleAffixes.length){
        const sorted=sortAffixNames(singleAffixes), rows=[];
        for(let i=0;i<sorted.length;i+=4){
          const items=sorted.slice(i,i+4).map(name=>markWidespread(markProbability(name,rareNames.has(name)),name,widespreadNames));
          rows.push(optimalRow(items,items.length===1&&sorted.length===1?"single-only":"sequence singles"));
        }
        blocks.push({priority:AFFIX_DISPLAY_PRIORITY[sorted[0]]||99,html:rows.join("")});
      }
      blocks.sort((a,b)=>a.priority-b.priority);
      const recommendedEntries=displayNames.flatMap(name=>{
        const result=resultsByName.get(name);
        return result?probabilityEntries(name,result,targetShots,false):[];
      });
      const summaryNotes=groupProbabilityNotes([...recommendedEntries,...unstableEntries],targetShots);
      return `<span class="optimal-affixes">${blocks.map(block=>block.html).join("")}${summaryNotes.length?`<span class="probability-notes">${summaryNotes.join("")}</span>`:""}</span>`;
    }
    function syncDesktopResultHeight(){
      const results=document.querySelector(".results");
      if(window.innerWidth<=1050){ results.style.height=""; return; }
      const controlsHeight=document.querySelector("#controls").offsetHeight;
      const summaryHeight=document.querySelector(".summary").offsetHeight;
      results.style.height=`${Math.max(320,controlsHeight-summaryHeight-14)}px`;
    }
    new ResizeObserver(syncDesktopResultHeight).observe(document.querySelector("#controls"));
    new ResizeObserver(syncDesktopResultHeight).observe(document.querySelector(".summary"));
    window.addEventListener("resize",syncDesktopResultHeight);

    function syncDesktopRowHeights(){
      document.querySelectorAll("#resultTable th, #resultTable td").forEach(cell=>cell.style.height="");
    }
    window.addEventListener("resize",syncDesktopRowHeights);

    function armorDisplay(row){
      const full=`<span class="armor-full"><span>${row.quality}甲</span><span class="armor-detail">${row.plates}格${row.variant?` ${row.variant}`:""}</span></span>`;
      const compact=row.quality==="究"?`${row.plates}${row.variant?` ${row.variant}`:""}`:String(row.plates);
      return `<span class="armor ${armorClass(row.quality)}">${full}<span class="armor-compact">${compact}</span></span>`;
    }

    function rankingQualityForWeapon(config,selectedQuality){
      if(config.name.startsWith("J358")&&["红","究"].includes(selectedQuality)) return "橙";
      if(config.name.startsWith("USS9")&&selectedQuality==="究") return "红";
      return selectedQuality;
    }
    function rankingColumnsForQuality(quality){
      const noAffix={name:"无词条",effects:[],armorBreak:false,flesh:false};
      if(rankingAffixMode==="none"||quality==="紫") return [noAffix];
      if(rankingAffixMode==="single"||quality==="橙") return columnsForQuality(singleColumns,quality);
      return columnsForQuality(doubleColumns,quality);
    }
    function rankingRangeIndex(){ return Math.max(0,+document.querySelector("#damageRange").value||0); }
    function rankingRangeLabel(){ return `第 ${rankingRangeIndex()+1} 段射程`; }
    function calculateRankings(){
      const quality=document.querySelector("#gunQuality").value, mainHit=document.querySelector("#mainHit").value, random=randomHits(), rangeIndex=rankingRangeIndex();
      rankingResults=armors.map((armorConfig,armorIndex)=>{
        const entries=weapons
          .map((weapon,weaponIndex)=>{
            const config=validateWeapon(weapon);
            const effectiveQuality=rankingQualityForWeapon(config,quality);
            const selectedRange=config.damageRanges[Math.min(rangeIndex,config.damageRanges.length-1)];
            const cfg={...config,quality:effectiveQuality,damage:+selectedRange.damage};
            const columns=rankingColumnsForQuality(effectiveQuality);
            const eligible=columns.map((column,index)=>columnCanAffectHits(column,mainHit,random)?index:-1).filter(index=>index>=0);
            const slots=sharedShotSlots(cfg,armorConfig,mainHit,columns,random);
            const values=columns.map(column=>expected(cfg,armorConfig,mainHit,random,column,20260728+armorIndex,slots,RANKING_SAMPLES));
            const plan=recommendationPlan(values,eligible);
            return {name:cfg.name,quality:effectiveQuality,ttk:(plan.targetShots-1)*cfg.shotIntervalMs,shots:plan.targetShots,weaponIndex};
          })
          .filter(Boolean)
          .sort((a,b)=>a.ttk-b.ttk||a.shots-b.shots||a.name.localeCompare(b.name,"zh-CN"));
        return {...armorConfig,entries};
      });
    }
    function drawRankingTable(){
      document.querySelector("#recommendationLegend").hidden=true;
      const entryCount=Math.max(0,...rankingResults.map(row=>row.entries.length));
      document.querySelector("#resultTable").classList.remove("compare-table");
      document.querySelector("thead").innerHTML=`<tr><th>护甲</th>${Array.from({length:entryCount},(_,index)=>`<th>第 ${index+1} 名</th>`).join("")}</tr>`;
      document.querySelector("tbody").innerHTML=rankingResults.map(row=>{
        const cells=[...row.entries];
        while(cells.length<entryCount) cells.push(null);
        return `<tr><td>${armorDisplay(row)}</td>${cells.map((entry,index)=>entry?`<td><span class="ranking-entry"><span class="ranking-position">${index+1}</span><span class="ranking-name" title="${entry.name} · ${entry.quality}品质">${entry.name}</span><span class="ranking-ttk">${Number.isInteger(entry.ttk)?entry.ttk:entry.ttk.toFixed(1)} ms</span></span></td>`:"<td>—</td>").join("")}</tr>`;
      }).join("");
      const tableWrapWidth=document.querySelector(".table-wrap").clientWidth;
      document.querySelector("#resultTable").style.minWidth=`${Math.max(tableWrapWidth,156+entryCount*210)}px`;
      requestAnimationFrame(syncDesktopRowHeights);
    }

    function drawTable(){
      const resultsPanel=document.querySelector(".results");
      resultsPanel.classList.toggle("curve-mode",affixMode==="curve"&&metricMode!=="ranking");
      if(affixMode==="curve"&&metricMode!=="ranking"){
        document.querySelector("#recommendationLegend").hidden=true;
        requestAnimationFrame(drawCurveChart);
        return;
      }
      if(metricMode==="ranking"){
        drawRankingTable();
        return;
      }
      if(affixMode==="compare"){
        const singleWidespread=widespreadAffixNames(lastResults,"singleCompare"), doubleWidespread=widespreadAffixNames(lastResults,"doubleCompare");
        document.querySelector("#recommendationLegend").hidden=singleWidespread.size+doubleWidespread.size===0;
        document.querySelector("#resultTable").classList.add("compare-table");
        document.querySelector("thead").innerHTML="<tr><th>护甲</th><th>单双伤差距</th><th>单伤最优</th><th>单伤词条</th><th>双伤最优</th><th>双伤词条</th></tr>";
        document.querySelector("tbody").innerHTML=lastResults.map(row=>{
          const singlePlan=recommendationPlan(row.singleValues,row.singleEligible), doublePlan=recommendationPlan(row.doubleValues,row.doubleEligible);
          const singleIndexes=uniqueIndexes([...singlePlan.recommended,...singlePlan.rare]);
          const doubleIndexes=uniqueIndexes([...doublePlan.recommended,...doublePlan.rare]);
          const singleNamesList=singleIndexes.map(i=>row.singleColumns[i].name), doubleNamesList=doubleIndexes.map(i=>row.doubleColumns[i].name);
          const singleMap=new Map(singleIndexes.map(i=>[row.singleColumns[i].name,row.singleValues[i]]));
          const doubleMap=new Map(doubleIndexes.map(i=>[row.doubleColumns[i].name,row.doubleValues[i]]));
          const singleUnstable=singlePlan.unstable.flatMap(i=>probabilityEntries(row.singleColumns[i].name,row.singleValues[i],singlePlan.targetShots,true));
          const doubleUnstable=doublePlan.unstable.flatMap(i=>probabilityEntries(row.doubleColumns[i].name,row.doubleValues[i],doublePlan.targetShots,true));
          const singleNames=formatOptimalNames(singleNamesList,new Set(singlePlan.rare.map(i=>row.singleColumns[i].name)),singleMap,singlePlan.targetShots,singleUnstable,singleWidespread);
          const doubleNames=formatOptimalNames(doubleNamesList,new Set(doublePlan.rare.map(i=>row.doubleColumns[i].name)),doubleMap,doublePlan.targetShots,doubleUnstable,doubleWidespread);
          const singleStrict=singlePlan.targetShots, doubleStrict=doublePlan.targetShots;
          const gapDisplay=metricMode==="shots"?Math.abs(singleStrict-doubleStrict):Math.abs(singleStrict-doubleStrict)*weaponConfig.shotIntervalMs;
          const singleBest=singleStrict<=doubleStrict?"best":"";
          const doubleBest=doubleStrict<=singleStrict?"best":"";
          const gapText=gapDisplay===0?'<span class="gap-highlight">无差距</span>':singleStrict>doubleStrict?`双伤减少 <span class="gap-highlight">${formatMetric(gapDisplay)}</span>`:`单伤减少 <span class="gap-highlight">${formatMetric(gapDisplay)}</span>`;
          return `<tr><td>${armorDisplay(row)}</td><td>${gapText}</td><td class="${singleBest}">${formatTargetResult(singleStrict)}</td><td>${singleNames}</td><td class="${doubleBest}">${formatTargetResult(doubleStrict)}</td><td>${doubleNames}</td></tr>`;
        }).join("");
        document.querySelector("#resultTable").style.minWidth="";
        requestAnimationFrame(syncDesktopRowHeights);
        return;
      }
      document.querySelector("#resultTable").classList.remove("compare-table");
      const columns=renderedColumns.length?renderedColumns:activeColumns();
      const widespread=viewMode==="best"?widespreadAffixNames(lastResults,affixMode):new Set();
      document.querySelector("#recommendationLegend").hidden=widespread.size===0;
      const visibleColumns=viewMode==="all"?columns:[{name:metricMode==="shots"?"通常最少枪数":"通常最少 TTK",summary:true},{name:"最优词条",summary:true}];
      document.querySelector("thead").innerHTML=`<tr><th>护甲</th>${visibleColumns.map(c=>`<th>${formatAffixName(c.name)}</th>`).join("")}</tr>`;
      document.querySelector("tbody").innerHTML=lastResults.map(row=>{
        if(viewMode==="best"){
          const plan=recommendationPlan(row.values,row.eligibleIndexes);
          const indexes=uniqueIndexes([...plan.recommended,...plan.rare]);
          const namesList=indexes.map(i=>columns[i].name);
          const resultMap=new Map(indexes.map(i=>[columns[i].name,row.values[i]]));
          const unstable=plan.unstable.flatMap(i=>probabilityEntries(columns[i].name,row.values[i],plan.targetShots,true));
          const names=formatOptimalNames(namesList,new Set(plan.rare.map(i=>columns[i].name)),resultMap,plan.targetShots,unstable,widespread);
          return `<tr><td>${armorDisplay(row)}</td><td class="best">${formatTargetResult(plan.targetShots)}</td><td>${names}</td></tr>`;
        }
        const plan=recommendationPlan(row.values,row.eligibleIndexes), recommended=new Set(plan.recommended);
        const relevant=new Set(row.eligibleIndexes);
        return `<tr><td>${armorDisplay(row)}</td>${row.values.map((result,i)=>{const note=allViewNote(result,relevant.has(i)),baseline=allViewBaseline(result);return `<td class="${recommended.has(i)?"best":""}">${formatTargetResult(baseline)}${note}</td>`}).join("")}</tr>`;
      }).join("");
      const tableWrapWidth=document.querySelector(".table-wrap").clientWidth;
      const naturalWidth=156+columns.length*(window.innerWidth<=600?100:108);
      document.querySelector("#resultTable").style.minWidth=viewMode==="best"?"100%":`${Math.max(tableWrapWidth,naturalWidth)}px`;
      requestAnimationFrame(syncDesktopRowHeights);
    }

    function render(){
      const button=document.querySelector("#calculate"), controls=document.querySelector("#controls"), error=document.querySelector("#error");
      if(!weaponConfig){ error.textContent="没有可用的枪械数据"; error.style.display="block"; return; }
      button.textContent="计算中…"; controls.classList.add("loading"); error.style.display="none";
      setTimeout(()=>{
        try{
          if(metricMode==="ranking"){
            const quality=document.querySelector("#gunQuality").value, mainHit=document.querySelector("#mainHit").value, random=randomHits();
            const randomText=Object.entries(random).filter(([,n])=>n).map(([region,count])=>`${regionLabels[region]}×${count}`).join(" / ")||"无";
            calculateRankings();
            document.querySelector("#weaponSummary").textContent=`全部枪械 · ${quality}`;
            document.querySelector("#rangeSummary").textContent=rankingRangeLabel();
            document.querySelector("#sceneSummary").textContent=sceneLabels[mainHit];
            document.querySelector("#randomSummary").textContent=randomText;
            document.querySelector("#status").textContent=`共 ${weapons.length} 把枪械 · ${quality}品质（或最高品质）· ${rankingAffixMode==="none"?"无词条":rankingAffixMode==="single"?"单伤":"双伤"} · ${rankingRangeLabel()}`;
            document.querySelector("#metricSummary").textContent="枪械 TTK 排行";
            drawTable();
            syncDesktopResultHeight();
            return;
          }
          const rangeIndex=+document.querySelector("#damageRange").value;
          const selectedRange=weaponConfig.damageRanges[rangeIndex];
          if(!selectedRange) throw new Error("请选择有效的射程区间");
          const cfg={...weaponConfig,quality:document.querySelector("#gunQuality").value,damage:+selectedRange.damage}, mainHit=document.querySelector("#mainHit").value, random=randomHits();
          document.querySelector("#weaponSummary").textContent=`${cfg.name} · ${cfg.quality}`;
          document.querySelector("#rangeSummary").textContent=rangeLabel(selectedRange);
          const randomText=Object.entries(random).filter(([,n])=>n).map(([r,n])=>`${regionLabels[r]}×${n}`).join(" / ")||"无";
          document.querySelector("#sceneSummary").textContent=sceneLabels[mainHit];
          document.querySelector("#randomSummary").textContent=randomText;
          if(affixMode==="curve"){
            syncCurveAffixOptions();
            document.querySelector("#status").textContent=`射程曲线 · ${formatAffixName(curveAffixName)} · ${metricMode==="ttk"?"TTK":"击杀枪数"} · 悬浮查看各护甲实际结果`;
            document.querySelector("#bestView").disabled=true;
            document.querySelector("#allView").disabled=true;
            drawTable();
            syncDesktopResultHeight();
            return;
          }
          if(cfg.quality==="紫"){
            const purpleColumns=[{name:"无词条",effects:[],armorBreak:false,flesh:false}];
            renderedColumns=purpleColumns;
            excludedColumns=[];
            lastResults=armors.map((armorConfig,ri)=>{
              const slots=sharedShotSlots(cfg,armorConfig,mainHit,purpleColumns,random);
              return {...armorConfig,eligibleIndexes:[0],values:[expected(cfg,armorConfig,mainHit,random,purpleColumns[0],20260728+ri,slots)]};
            });
            affixMode="single";
            document.querySelector("#singleAffix").classList.add("active");
            document.querySelector("#doubleAffix").classList.remove("active");
            document.querySelector("#compareAffix").classList.remove("active");
            document.querySelector("#doubleAffix").disabled=true;
            document.querySelector("#compareAffix").disabled=true;
          } else {
            const orange=cfg.quality==="橙";
            document.querySelector("#doubleAffix").disabled=orange;
            document.querySelector("#compareAffix").disabled=orange;
            if(affixMode==="compare"){
              const noAffix={name:"无词条",effects:[],armorBreak:false,flesh:false};
              const singleCompareColumns=[noAffix,...columnsForQuality(singleColumns,cfg.quality)];
              const doubleCompareColumns=columnsForQuality(doubleColumns,cfg.quality);
              renderedColumns=[];
              excludedColumns=[];
              const allCompareColumns=[...singleCompareColumns,...doubleCompareColumns];
              lastResults=armors.map((armorConfig,ri)=>{
                const slots=sharedShotSlots(cfg,armorConfig,mainHit,allCompareColumns,random);
                return {
                  ...armorConfig,
                  singleColumns:singleCompareColumns,
                  doubleColumns:doubleCompareColumns,
                  singleEligible:singleCompareColumns.map((_,index)=>index).filter(index=>columnCanAffectHits(singleCompareColumns[index],mainHit,random)),
                  doubleEligible:doubleCompareColumns.map((_,index)=>index).filter(index=>columnCanAffectHits(doubleCompareColumns[index],mainHit,random)),
                  singleValues:singleCompareColumns.map(c=>expected(cfg,armorConfig,mainHit,random,c,20260728+ri,slots)),
                  doubleValues:doubleCompareColumns.map(c=>expected(cfg,armorConfig,mainHit,random,c,20260728+ri,slots))
                };
              });
            } else {
              const columns=activeColumns();
              const eligibleIndexes=columns.map((column,index)=>columnCanAffectHits(column,mainHit,random)?index:-1).filter(index=>index>=0);
              renderedColumns=columns;
              excludedColumns=[];
              lastResults=armors.map((armorConfig,ri)=>{
                const slots=sharedShotSlots(cfg,armorConfig,mainHit,columns,random);
                return {...armorConfig,eligibleIndexes,values:columns.map(c=>expected(cfg,armorConfig,mainHit,random,c,20260728+ri,slots))};
              });
            }
          }
          document.querySelector("#status").textContent=`${cfg.quality==="紫"?"无词条":affixMode==="single"?"单伤":affixMode==="double"?"双伤":"单双伤对比"} · ${SAMPLES.toLocaleString()} 次随机模拟 · 确定目标枪数，并比较命中概率`;
          viewMode=viewAfterRender||"best";
          viewAfterRender=null;
          document.querySelector("#bestView").classList.toggle("active",viewMode==="best");
          document.querySelector("#allView").classList.toggle("active",viewMode==="all");
          drawTable();
      syncDesktopResultHeight();
        } catch(e){ error.textContent=e.message; error.style.display="block"; }
        finally { button.textContent="重新计算"; controls.classList.remove("loading"); }
      },20);
    }
    document.querySelector("#calculate").addEventListener("click",render);
    function setAffixMode(mode){
      const quality=document.querySelector("#gunQuality").value;
      if(mode==="curve"){
        if(metricMode==="ranking") return;
        affixMode="curve";
        ["singleAffix","doubleAffix","compareAffix","curveAffix"].forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id==="curveAffix"));
        document.querySelector("#bestView").disabled=true;
        document.querySelector("#allView").disabled=true;
        syncCurveAffixOptions();
        document.querySelector("#status").textContent=`射程曲线 · ${formatAffixName(curveAffixName)} · ${metricMode==="ttk"?"TTK":"击杀枪数"} · 悬浮查看各护甲实际结果`;
        drawTable();
        setTimeout(drawCurveChart,0);
        return;
      }
      if(metricMode==="ranking"){
        if(mode==="compare" || (quality==="紫"&&mode!=="none") || (quality==="橙"&&mode==="double")) return;
        rankingAffixMode=mode;
        const buttonIds={none:"singleAffix",single:"doubleAffix",double:"compareAffix"};
        Object.values(buttonIds).forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[mode]));
        render();
        return;
      }
      if(quality==="紫" || (quality==="橙" && mode!=="single")) return;
      affixMode=mode;
      const buttonIds={single:"singleAffix",double:"doubleAffix",compare:"compareAffix"};
      ["singleAffix","doubleAffix","compareAffix","curveAffix"].forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[mode]));
      const comparing=mode==="compare";
      document.querySelector("#bestView").disabled=comparing;
      document.querySelector("#allView").disabled=false;
      render();
    }
    document.querySelector("#singleAffix").addEventListener("click",()=>setAffixMode(metricMode==="ranking"?"none":"single"));
    document.querySelector("#doubleAffix").addEventListener("click",()=>setAffixMode(metricMode==="ranking"?"single":"double"));
    document.querySelector("#compareAffix").addEventListener("click",()=>setAffixMode(metricMode==="ranking"?"double":"compare"));
    document.querySelector("#curveAffix").addEventListener("click",()=>setAffixMode("curve"));
    document.querySelector("#curveAffixSelect").addEventListener("change",event=>{
      curveAffixName=event.target.value;
      document.querySelector("#status").textContent=`射程曲线 · ${formatAffixName(curveAffixName)} · ${metricMode==="ttk"?"TTK":"击杀枪数"} · 悬浮查看各护甲实际结果`;
      drawCurveChart();
    });
    function setMetricMode(mode){
      metricMode=mode;
      ["shots","ttk","ranking"].forEach(key=>document.querySelector(`#${key}Metric`).classList.toggle("active",key===mode));
      const ranking=mode==="ranking", quality=document.querySelector("#gunQuality").value;
      document.querySelector("#singleAffix").textContent=ranking?"无词条":"单伤";
      document.querySelector("#doubleAffix").textContent=ranking?"单伤":"双伤";
      document.querySelector("#compareAffix").textContent=ranking?"双伤":"对比";
      document.querySelector("#curveAffix").hidden=ranking;
      document.querySelector("#curveHelpWrap").hidden=ranking;
      if(ranking&&affixMode==="curve") affixMode="single";
      if(ranking){
        if(quality==="紫") rankingAffixMode="none";
        else if(quality==="橙"&&rankingAffixMode==="double") rankingAffixMode="single";
        const buttonIds={none:"singleAffix",single:"doubleAffix",double:"compareAffix"};
        Object.values(buttonIds).forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[rankingAffixMode]));
      } else {
        const buttonIds={single:"singleAffix",double:"doubleAffix",compare:"compareAffix",curve:"curveAffix"};
        Object.values(buttonIds).forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[affixMode]));
      }
      document.querySelector("#singleAffix").disabled=ranking?false:quality==="紫";
      document.querySelector("#doubleAffix").disabled=ranking?quality==="紫":["紫","橙"].includes(quality);
      document.querySelector("#compareAffix").disabled=ranking?["紫","橙"].includes(quality):["紫","橙"].includes(quality);
      document.querySelector("#bestView").disabled=ranking||["compare","curve"].includes(affixMode);
      document.querySelector("#allView").disabled=ranking||affixMode==="curve";
      document.querySelector("#metricSummary").textContent=mode==="shots"?"击杀枪数":mode==="ttk"?"TTK（首枪 0ms）":"枪械 TTK 排行";
      if(affixMode==="curve"&&!ranking){
        syncCurveAffixOptions();
        document.querySelector("#status").textContent=`射程曲线 · ${formatAffixName(curveAffixName)} · ${mode==="ttk"?"TTK":"击杀枪数"} · 悬浮查看各护甲实际结果`;
        drawTable();
      }
      else if(ranking) render();
      else drawTable();
    }
    document.querySelector("#shotsMetric").addEventListener("click",()=>setMetricMode("shots"));
    document.querySelector("#ttkMetric").addEventListener("click",()=>setMetricMode("ttk"));
    document.querySelector("#rankingMetric").addEventListener("click",()=>setMetricMode("ranking"));
    const curveGuideDialog=document.querySelector("#curveGuideDialog");
    document.querySelector("#curveHelp").addEventListener("click",()=>curveGuideDialog.showModal());
    document.querySelector("#curveGuideClose").addEventListener("click",()=>curveGuideDialog.close());
    curveGuideDialog.addEventListener("click",event=>{
      const bounds=curveGuideDialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) curveGuideDialog.close();
    });
    const rankingGuideDialog=document.querySelector("#rankingGuideDialog");
    document.querySelector("#rankingHelp").addEventListener("click",()=>rankingGuideDialog.showModal());
    document.querySelector("#rankingGuideClose").addEventListener("click",()=>rankingGuideDialog.close());
    rankingGuideDialog.addEventListener("click",event=>{
      const bounds=rankingGuideDialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) rankingGuideDialog.close();
    });
    document.querySelector("#bestView").addEventListener("click",()=>{viewMode="best";document.querySelector("#bestView").classList.add("active");document.querySelector("#allView").classList.remove("active");drawTable();});
    document.querySelector("#allView").addEventListener("click",()=>{
      if(affixMode==="compare"){
        viewAfterRender="all";
        setAffixMode("single");
        return;
      }
      viewMode="all";
      document.querySelector("#allView").classList.add("active");
      document.querySelector("#bestView").classList.remove("active");
      drawTable();
    });
    window.addEventListener("resize",()=>{
      if(affixMode!=="curve") return;
      cancelAnimationFrame(curveResizeFrame);
      curveResizeFrame=requestAnimationFrame(drawCurveChart);
    });
    document.querySelector("#resultTable").addEventListener("click",event=>{
      const trigger=event.target.closest(".reason-trigger");
      document.querySelectorAll(".reason-marker.open").forEach(marker=>{
        if(!trigger||marker!==trigger.closest(".reason-marker")) marker.classList.remove("open");
      });
      if(trigger) trigger.closest(".reason-marker").classList.toggle("open");
    });
    document.querySelector(".table-wrap").addEventListener("scroll",()=>document.querySelectorAll(".reason-marker.open").forEach(marker=>marker.classList.remove("open")),{passive:true});

    const guideDialog=document.querySelector("#guideDialog");
    document.querySelector("#guideButton").addEventListener("click",()=>guideDialog.showModal());
    document.querySelector("#guideClose").addEventListener("click",()=>guideDialog.close());
    guideDialog.addEventListener("click",event=>{
      const bounds=guideDialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) guideDialog.close();
    });

    const mechanicsDialog=document.querySelector("#mechanicsDialog");
    document.querySelector("#mechanicsButton").addEventListener("click",()=>mechanicsDialog.showModal());
    document.querySelector("#mechanicsClose").addEventListener("click",()=>mechanicsDialog.close());
    mechanicsDialog.addEventListener("click",event=>{
      const bounds=mechanicsDialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) mechanicsDialog.close();
    });

    updateAffixAvailability();
    applyRandomPreset("normal");
    populateWeapons(BUILT_IN_WEAPONS);
    render();
    loadWeapons();
