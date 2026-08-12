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
    function rankingMaxDistance(){ return Math.max(...weapons.flatMap(weapon=>validateWeapon(weapon).damageRanges.map(range=>range.max))); }
    function rankingResultAtRange(config,range,armorConfig,armorIndex,mainHit,random){
      const cfg={...config,damage:+range.damage}, columns=rankingColumnsForQuality(cfg.quality);
      const eligible=columns.map((column,index)=>columnCanAffectHits(column,mainHit,random)?index:-1).filter(index=>index>=0);
      const slots=sharedShotSlots(cfg,armorConfig,mainHit,columns,random);
      const values=columns.map(column=>expected(cfg,armorConfig,mainHit,random,column,20260728+armorIndex,slots,RANKING_SAMPLES));
      const plan=recommendationPlan(values,eligible);
      return {shots:plan.targetShots,ttk:(plan.targetShots-1)*cfg.shotIntervalMs};
    }
    function rankingEntryAtDistance(entry,distance){
      const point=entry.points.find((item,index)=>distance>=item.min&&(distance<item.max||index===entry.points.length-1&&distance<=item.max));
      return point?{name:entry.name,quality:entry.quality,weaponIndex:entry.weaponIndex,...point}:null;
    }
    function rankingEntriesAtDistance(row,distance){
      return row.entries.map(entry=>rankingEntryAtDistance(entry,distance)).filter(Boolean).sort((a,b)=>a.ttk-b.ttk||a.shots-b.shots||a.name.localeCompare(b.name,"zh-CN"));
    }
    function rankingText(value){ return Number.isInteger(value)?String(value):value.toFixed(1); }
    function rankingDistanceText(){ return `${rankingDistance.toFixed(1)} 米`; }
    const RANKING_SLIDER_BREAK_DISTANCE=60, RANKING_SLIDER_BREAK_POSITION=.88, RANKING_SLIDER_STEPS=10000;
    function rankingDistanceToSlider(distance){
      const max=rankingMaxDistance(), clamped=Math.max(0,Math.min(max,distance));
      const ratio=clamped<=RANKING_SLIDER_BREAK_DISTANCE
        ?clamped/RANKING_SLIDER_BREAK_DISTANCE*RANKING_SLIDER_BREAK_POSITION
        :RANKING_SLIDER_BREAK_POSITION+(clamped-RANKING_SLIDER_BREAK_DISTANCE)/(max-RANKING_SLIDER_BREAK_DISTANCE)*(1-RANKING_SLIDER_BREAK_POSITION);
      return Math.round(ratio*RANKING_SLIDER_STEPS);
    }
    function rankingSliderToDistance(value){
      const max=rankingMaxDistance(), ratio=Math.max(0,Math.min(1,Number(value)/RANKING_SLIDER_STEPS));
      const distance=ratio<=RANKING_SLIDER_BREAK_POSITION
        ?ratio/RANKING_SLIDER_BREAK_POSITION*RANKING_SLIDER_BREAK_DISTANCE
        :RANKING_SLIDER_BREAK_DISTANCE+(ratio-RANKING_SLIDER_BREAK_POSITION)/(1-RANKING_SLIDER_BREAK_POSITION)*(max-RANKING_SLIDER_BREAK_DISTANCE);
      return Math.round(distance*10)/10;
    }
    function syncRankingDistanceControls(){
      const max=rankingMaxDistance(), slider=document.querySelector("#rankingDistance");
      rankingDistance=Math.max(0,Math.min(max,rankingDistance));
      slider.value=String(rankingDistanceToSlider(rankingDistance));
      const valueInput=document.querySelector("#rankingDistanceValue");
      valueInput.max=String(max);
      if(document.activeElement!==valueInput) valueInput.value=rankingDistance.toFixed(1);
    }
    function calculateRankings(){
      const quality=rankingQuality, mainHit=document.querySelector("#mainHit").value, random=randomHits();
      rankingResults=armors.map((armorConfig,armorIndex)=>({
        ...armorConfig,
        entries:weapons.map((weapon,weaponIndex)=>{
          const config=validateWeapon(weapon); config.quality=rankingQualityForWeapon(config,quality);
          return {name:config.name,quality:config.quality,weaponIndex,points:config.damageRanges.map(range=>({...range,...rankingResultAtRange(config,range,armorConfig,armorIndex,mainHit,random)}))};
        })
      }));
      syncRankingDistanceControls();
    }
    function drawRankingTable(){
      document.querySelector("#recommendationLegend").hidden=true;
      const rows=rankingResults.map(row=>({...row,visibleEntries:rankingEntriesAtDistance(row,rankingDistance)}));
      const entryCount=Math.max(0,...rows.map(row=>row.visibleEntries.length));
      document.querySelector("#resultTable").classList.remove("compare-table");
      document.querySelector("thead").innerHTML=`<tr><th>护甲</th>${Array.from({length:entryCount},(_,index)=>`<th>第 ${index+1} 名</th>`).join("")}</tr>`;
      document.querySelector("tbody").innerHTML=rows.map(row=>{
        const cells=[...row.visibleEntries];
        while(cells.length<entryCount) cells.push(null);
        return `<tr><td>${armorDisplay(row)}</td>${cells.map((entry,index)=>entry?`<td class="ranking-cell${entry.weaponIndex===rankingHighlightedWeaponIndex?" highlighted":""}" data-ranking-weapon-index="${entry.weaponIndex}" title="${entry.weaponIndex===rankingHighlightedWeaponIndex?"点击取消高亮当前武器":"点击高亮当前武器"}"><span class="ranking-entry"><span class="ranking-position">${index+1}</span><span class="ranking-name" title="${entry.name} · ${entry.quality}品质">${entry.name}</span><span class="ranking-ttk">${rankingText(entry.ttk)} ms</span><span class="ranking-highlight-hint">${entry.weaponIndex===rankingHighlightedWeaponIndex?"点击取消高亮":"点击高亮当前武器"}</span></span></td>`:"<td>—</td>").join("")}</tr>`;
      }).join("");
      const tableWrapWidth=document.querySelector(".table-wrap").clientWidth;
      document.querySelector("#resultTable").style.minWidth=`${Math.max(tableWrapWidth,156+entryCount*148)}px`;
      document.querySelector("#rangeSummary").textContent=rankingDistanceText();
      document.querySelector("#status").textContent=`共 ${weapons.length} 把枪械 · ${rankingQuality}品质（或最高品质）· ${rankingAffixMode==="none"?"无词条":rankingAffixMode==="single"?"单伤最优":"双伤最优"} · ${rankingDistanceText()}`;
      requestAnimationFrame(syncDesktopRowHeights);
    }
