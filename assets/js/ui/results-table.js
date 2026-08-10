    function drawTable(){
      const resultsPanel=document.querySelector(".results");
      resultsPanel.classList.toggle("curve-mode",affixMode==="curve"&&metricMode!=="ranking");
      resultsPanel.classList.remove("ranking-curve-mode");
      if(metricMode==="ranking"){
        document.querySelector("#recommendationLegend").hidden=true;
        drawRankingTable();
        return;
      }
      if(affixMode==="curve"){
        document.querySelector("#recommendationLegend").hidden=true;
        requestAnimationFrame(drawCurveChart);
        return;
      }
      if(affixMode==="compare"){
        drawComparisonTable();
        return;
      }
      document.querySelector("#resultTable").classList.remove("compare-table","scheme-compare-table");
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

