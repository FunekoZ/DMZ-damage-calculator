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

