    function comparisonNoAffix(){ return {name:"无词条",effects:[],armorBreak:false,flesh:false}; }
    function comparisonWeaponConfig(index){ return validateWeapon(weapons[Math.max(0,Math.min(weapons.length-1,index??0))]); }
    function comparisonQualities(config){
      if(config.name.startsWith("J358")) return ["紫","橙"];
      if(config.name.startsWith("USS9")) return ["紫","橙","红"];
      return ["紫","橙","红","究"];
    }
    function comparisonColumns(quality){
      const noAffix=comparisonNoAffix();
      if(quality==="紫") return [noAffix];
      const singles=columnsForQuality(singleColumns,quality);
      return quality==="橙"?[noAffix,...singles]:[noAffix,...singles,...columnsForQuality(doubleColumns,quality)];
    }
    function comparisonAffixKey(column){ return column.name==="无词条"?"none":column.name; }
    function comparisonColumn(quality,key){ return comparisonColumns(quality).find(column=>comparisonAffixKey(column)===key)||comparisonColumns(quality)[0]; }
    function comparisonRange(config,distance){
      return config.damageRanges.find((range,index)=>distance>=range.min&&(distance<range.max||index===config.damageRanges.length-1&&distance<=range.max))||config.damageRanges.at(-1);
    }
    function comparisonBestConcreteAffix(config,quality,mode){
      if(quality==="紫") return "none";
      const candidates=columnsForQuality(mode==="single"?singleColumns:doubleColumns,quality);
      if(!candidates.length) return comparisonAffixKey(comparisonColumns(quality)[0]);
      const mainHit=document.querySelector("#mainHit").value, random=randomHits(), range=comparisonRange(config,comparisonDistance), scores=new Array(candidates.length).fill(0);
      armors.forEach((armorConfig,index)=>{
        const cfg={...config,quality,damage:+range.damage}, eligible=candidates.map((column,columnIndex)=>columnCanAffectHits(column,mainHit,random)?columnIndex:-1).filter(columnIndex=>columnIndex>=0);
        const slots=sharedShotSlots(cfg,armorConfig,mainHit,candidates,random);
        const values=candidates.map(column=>expected(cfg,armorConfig,mainHit,random,column,20260728+index,slots,RANKING_SAMPLES));
        recommendationPlan(values,eligible.length?eligible:values.map((_,columnIndex)=>columnIndex)).recommended.forEach(columnIndex=>scores[columnIndex]++);
      });
      return comparisonAffixKey(candidates[scores.indexOf(Math.max(...scores))]);
    }
    function initializeComparisonDefaults(){
      if(comparisonAWeaponIndex===null) comparisonAWeaponIndex=+document.querySelector("#weaponSelect").value||0;
      if(comparisonBWeaponIndex===null) comparisonBWeaponIndex=comparisonAWeaponIndex;
      const aConfig=comparisonWeaponConfig(comparisonAWeaponIndex), bConfig=comparisonWeaponConfig(comparisonBWeaponIndex);
      if(!comparisonAQuality) comparisonAQuality=comparisonQualities(aConfig).at(-1);
      if(!comparisonBQuality) comparisonBQuality=comparisonQualities(bConfig).at(-1);
      if(!comparisonAAffix) comparisonAAffix=comparisonBestConcreteAffix(aConfig,comparisonAQuality,"single");
      if(!comparisonBAffix) comparisonBAffix=comparisonBestConcreteAffix(bConfig,comparisonBQuality,comparisonBQuality==="橙"?"single":"double");
    }
    function comparisonWeaponOption(index,config,side){
      const button=weaponOption({index,config});
      button.dataset.comparisonSide=side;
      return button;
    }
    function comparisonWeaponGroup(title,items,side){
      const group=document.createElement("div"); group.className="weapon-select-group";
      const heading=document.createElement("span"); heading.className="weapon-select-group-title"; heading.textContent=title;
      group.append(heading,...items.map(item=>comparisonWeaponOption(item.index,item.config,side)));
      return group;
    }
    function syncComparisonWeaponPicker(side,index){
      const config=comparisonWeaponConfig(index), row=document.querySelector(`#comparison${side}WeaponRow`);
      row.querySelector("select").value=String(index);
      row.querySelector(".comparison-weapon-trigger").textContent=config.name;
      row.querySelectorAll(".weapon-select-option").forEach(option=>option.classList.toggle("active",+option.dataset.value===index));
    }
    function syncComparisonWeaponOptions(){
      const validated=weapons.map((weapon,index)=>({index,config:validateWeapon(weapon)}));
      ["A","B"].forEach(side=>{
        const select=document.querySelector(`#comparison${side}Weapon`), menu=document.querySelector(`#comparison${side}WeaponMenu`);
        select.replaceChildren(...validated.map(item=>new Option(item.config.name,String(item.index))));
        menu.replaceChildren(
          comparisonWeaponGroup("带究极配件",validated.filter(item=>isUltimateWeapon(item.config.name)),side),
          comparisonWeaponGroup("不带究极配件",validated.filter(item=>!isUltimateWeapon(item.config.name)),side)
        );
        syncComparisonWeaponPicker(side,side==="A"?comparisonAWeaponIndex:comparisonBWeaponIndex);
      });
    }
    function syncComparisonQualitySelect(selectId,config,quality){
      const qualities=comparisonQualities(config), select=document.querySelector(`#${selectId}`);
      if(!qualities.includes(quality)) quality=qualities.at(-1);
      select.replaceChildren(...qualities.map(item=>new Option(item,item))); select.value=quality;
      return quality;
    }
    function syncComparisonAffixSelect(selectId,quality,key){
      const select=document.querySelector(`#${selectId}`), columns=comparisonColumns(quality);
      select.replaceChildren(...columns.map(column=>new Option(formatAffixName(column.name),comparisonAffixKey(column))));
      const selected=columns.some(column=>comparisonAffixKey(column)===key)?key:comparisonAffixKey(columns[0]);
      select.value=selected;
      return selected;
    }
    function comparisonMaxDistance(){
      const configs=[comparisonWeaponConfig(comparisonAWeaponIndex),comparisonWeaponConfig(comparisonBWeaponIndex)];
      return Math.max(...configs.flatMap(config=>config.damageRanges.map(range=>range.max)));
    }
    function comparisonDistanceToSlider(distance){
      const max=comparisonMaxDistance(), breakpoint=Math.min(60,max), compressed=max>60, breakPosition=compressed?.88:1, clamped=Math.max(0,Math.min(max,distance));
      const ratio=!compressed?clamped/max:clamped<=breakpoint?clamped/breakpoint*breakPosition:breakPosition+(clamped-breakpoint)/(max-breakpoint)*(1-breakPosition);
      return Math.round(ratio*RANKING_SLIDER_STEPS);
    }
    function comparisonSliderToDistance(value){
      const max=comparisonMaxDistance(), breakpoint=Math.min(60,max), compressed=max>60, breakPosition=compressed?.88:1, ratio=Math.max(0,Math.min(1,Number(value)/RANKING_SLIDER_STEPS));
      const distance=!compressed?ratio*max:ratio<=breakPosition?ratio/breakPosition*breakpoint:breakpoint+(ratio-breakPosition)/(1-breakPosition)*(max-breakpoint);
      return Math.round(distance*10)/10;
    }
    function syncComparisonControls(){
      initializeComparisonDefaults(); syncComparisonWeaponOptions();
      const aConfig=comparisonWeaponConfig(comparisonAWeaponIndex), bConfig=comparisonWeaponConfig(comparisonBWeaponIndex);
      comparisonAQuality=syncComparisonQualitySelect("comparisonAQuality",aConfig,comparisonAQuality);
      comparisonBQuality=syncComparisonQualitySelect("comparisonBQuality",bConfig,comparisonBQuality);
      comparisonAAffix=syncComparisonAffixSelect("comparisonAAffix",comparisonAQuality,comparisonAAffix);
      comparisonBAffix=syncComparisonAffixSelect("comparisonBAffix",comparisonBQuality,comparisonBAffix);
      comparisonDistance=Math.max(0,Math.min(comparisonMaxDistance(),comparisonDistance));
      document.querySelector("#comparisonDistance").value=String(comparisonDistanceToSlider(comparisonDistance));
      const valueInput=document.querySelector("#comparisonDistanceValue");
      valueInput.max=String(comparisonMaxDistance());
      if(document.activeElement!==valueInput) valueInput.value=comparisonDistance.toFixed(1);
    }
    function comparisonResult(config,quality,column,armorConfig,mainHit,random,index){
      const range=comparisonRange(config,comparisonDistance), cfg={...config,quality,damage:+range.damage}, slots=sharedShotSlots(cfg,armorConfig,mainHit,[column],random);
      return recommendationPlan([expected(cfg,armorConfig,mainHit,random,column,20260728+index,slots)],[0]).targetShots;
    }
    function calculateComparison(){
      const mainHit=document.querySelector("#mainHit").value, random=randomHits(), aConfig=comparisonWeaponConfig(comparisonAWeaponIndex), bConfig=comparisonWeaponConfig(comparisonBWeaponIndex);
      const aColumn=comparisonColumn(comparisonAQuality,comparisonAAffix), bColumn=comparisonColumn(comparisonBQuality,comparisonBAffix);
      comparisonResults=armors.map((armorConfig,index)=>{
        const aShots=comparisonResult(aConfig,comparisonAQuality,aColumn,armorConfig,mainHit,random,index), bShots=comparisonResult(bConfig,comparisonBQuality,bColumn,armorConfig,mainHit,random,index);
        const aValue=metricMode==="shots"?aShots:(aShots-1)*aConfig.shotIntervalMs, bValue=metricMode==="shots"?bShots:(bShots-1)*bConfig.shotIntervalMs;
        return {...armorConfig,aShots,bShots,aValue,bValue};
      });
    }
    function comparisonSchemeLabel(config,quality,key){ return `${config.name} · ${quality} · ${formatAffixName(comparisonColumn(quality,key).name)}`; }
    function comparisonMetricText(value){ return metricMode==="shots"?`${rankingText(value)} 枪`:`${rankingText(value)} ms`; }
    function drawComparisonTable(){
      const aLabel=comparisonSchemeLabel(comparisonWeaponConfig(comparisonAWeaponIndex),comparisonAQuality,comparisonAAffix), bLabel=comparisonSchemeLabel(comparisonWeaponConfig(comparisonBWeaponIndex),comparisonBQuality,comparisonBAffix);
      const table=document.querySelector("#resultTable");
      table.classList.add("compare-table","scheme-compare-table");
      document.querySelector("#recommendationLegend").hidden=true;
      document.querySelector("thead").innerHTML=`<tr><th>护甲</th><th>差距</th><th class="comparison-a-heading"><span class="comparison-column-key">A</span><span class="comparison-column-label" title="${aLabel}">${aLabel}</span></th><th class="comparison-b-heading"><span class="comparison-column-key">B</span><span class="comparison-column-label" title="${bLabel}">${bLabel}</span></th></tr>`;
      document.querySelector("tbody").innerHTML=comparisonResults.map(row=>{
        const gap=Math.abs(row.aValue-row.bValue), aBest=row.aValue<=row.bValue?"best":"", bBest=row.bValue<=row.aValue?"best":"";
        const gapText=gap===0?'<span class="gap-highlight">无差距</span>':row.aValue<row.bValue?`A 减少 <span class="gap-highlight">${comparisonMetricText(gap)}</span>`:`B 减少 <span class="gap-highlight">${comparisonMetricText(gap)}</span>`;
        return `<tr><td>${armorDisplay(row)}</td><td>${gapText}</td><td class="${aBest}">${comparisonMetricText(row.aValue)}</td><td class="${bBest}">${comparisonMetricText(row.bValue)}</td></tr>`;
      }).join("");
      document.querySelector("#resultTable").style.minWidth=""; document.querySelector("#rangeSummary").textContent=`${comparisonDistance.toFixed(1)} 米`;
      document.querySelector("#status").textContent=`方案 A：${aLabel} · 方案 B：${bLabel} · ${comparisonDistance.toFixed(1)} 米`;
      requestAnimationFrame(syncDesktopRowHeights);
    }
    function refreshComparison(){ if(affixMode==="compare"&&metricMode!=="ranking"){ syncComparisonControls(); calculateComparison(); drawTable(); } }
