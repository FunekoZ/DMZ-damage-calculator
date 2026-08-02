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

