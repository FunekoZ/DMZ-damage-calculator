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
