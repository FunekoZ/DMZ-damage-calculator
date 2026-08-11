    function setAffixMode(mode){
      const quality=document.querySelector("#gunQuality").value;
      if(mode==="curve"){
        if(metricMode==="ranking"){
          metricMode="shots";
          document.querySelector("#damageRangeField").hidden=false;
          document.querySelector("#rankingDistanceField").hidden=true;
          updateDamageRanges();
          ["shots","ttk","ranking"].forEach(key=>document.querySelector(`#${key}Metric`).classList.toggle("active",key==="shots"));
          document.querySelector("#singleAffix").textContent="单伤";
          document.querySelector("#doubleAffix").textContent="双伤";
          document.querySelector("#compareAffix").textContent="对比";
          document.querySelector("#metricSummary").textContent="击杀枪数";
        }
        affixMode="curve";
        document.querySelector("#comparisonPanel").hidden=true;
        document.querySelector("#damageRangeField").hidden=false;
        updateAffixAvailability();
        document.querySelector("#bestView").disabled=true;
        document.querySelector("#allView").disabled=true;
        document.querySelector("#exportTable").disabled=true;
        syncCurveAffixOptions();
        document.querySelector("#status").textContent=`射程曲线 · ${formatAffixName(curveAffixName)} · ${metricMode==="ttk"?"TTK":"击杀枪数"} · 悬浮查看各护甲实际结果`;
        drawTable();
        setTimeout(drawCurveChart,0);
        if(document.querySelector("#weaponSummary").textContent.startsWith("全部枪械")) render();
        return;
      }
      if(metricMode==="ranking"){
        if(mode==="compare"){
          metricMode="shots";
          ["shots","ttk","ranking"].forEach(key=>document.querySelector(`#${key}Metric`).classList.toggle("active",key==="shots"));
          document.querySelector("#rankingDistanceField").hidden=true;
          document.querySelector("#rankingPanel").hidden=true;
          document.querySelector("#rankingAffixControls").hidden=true;
          document.querySelector("#metricSummary").textContent="击杀枪数";
          updateDamageRanges();
        } else return;
      }
      if(quality==="紫"&&mode!=="compare" || (quality==="橙" && !["single","compare"].includes(mode))) return;
      affixMode=mode;
      if(mode==="compare"&&comparisonAWeaponIndex===null){
        comparisonAWeaponIndex=+document.querySelector("#weaponSelect").value||0;
        comparisonBWeaponIndex=comparisonAWeaponIndex;
      }
      const buttonIds={single:"singleAffix",double:"doubleAffix",compare:"compareAffix"};
      ["singleAffix","doubleAffix","compareAffix","curveAffix"].forEach(id=>document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[mode]));
      const comparing=mode==="compare";
      document.querySelector("#comparisonPanel").hidden=!comparing;
      document.querySelector("#damageRangeField").hidden=comparing;
      document.querySelector("#bestView").disabled=comparing;
      document.querySelector("#allView").disabled=comparing;
      document.querySelector("#exportTable").disabled=false;
      if(comparing){
        comparisonDistance=Math.min(comparisonDistance,comparisonMaxDistance());
        syncComparisonControls();
      }
      render();
    }
    document.querySelector("#singleAffix").addEventListener("click",()=>setAffixMode("single"));
    document.querySelector("#doubleAffix").addEventListener("click",()=>setAffixMode("double"));
    document.querySelector("#compareAffix").addEventListener("click",()=>setAffixMode("compare"));
    document.querySelector("#rankingNoAffix").addEventListener("click",()=>setRankingAffixMode("none"));
    document.querySelector("#rankingSingleAffix").addEventListener("click",()=>setRankingAffixMode("single"));
    document.querySelector("#rankingDoubleAffix").addEventListener("click",()=>setRankingAffixMode("double"));
    document.querySelector("#curveAffix").addEventListener("click",()=>setAffixMode("curve"));
    function setRankingAffixMode(mode){
      if(metricMode!=="ranking") return;
      const quality=rankingQuality;
      if((quality==="紫"&&mode!=="none")||(quality==="橙"&&mode==="double")) return;
      rankingAffixMode=mode;
      updateAffixAvailability();
      render();
    }
    document.querySelector("#curveAffixSelect").addEventListener("change",event=>{
      curveAffixName=event.target.value;
      document.querySelector("#status").textContent=`射程曲线 · ${formatAffixName(curveAffixName)} · ${metricMode==="ttk"?"TTK":"击杀枪数"} · 悬浮查看各护甲实际结果`;
      drawCurveChart();
    });
    document.querySelector("#exportTable").addEventListener("click",exportStandardTable);
    document.querySelector("#exportCurve").addEventListener("click",exportCurveData);
    function setMetricMode(mode){
      const wasRanking=metricMode==="ranking";
      if(!wasRanking) standardRangeIndex=+document.querySelector("#damageRange").value||0;
      metricMode=mode;
      ["shots","ttk","ranking"].forEach(key=>document.querySelector(`#${key}Metric`).classList.toggle("active",key===mode));
      const ranking=mode==="ranking";
      document.querySelector("#damageRangeField").hidden=ranking||affixMode==="compare";
      document.querySelector("#rankingDistanceField").hidden=!ranking;
      document.querySelector("#rankingPanel").hidden=!ranking;
      document.querySelector("#comparisonPanel").hidden=ranking||affixMode!=="compare";
      document.querySelector("#rankingAffixControls").hidden=!ranking;
      if(ranking) syncRankingDistanceControls();
      if(!ranking&&wasRanking) updateDamageRanges();
      if(ranking&&affixMode==="curve") affixMode="single";
      updateAffixAvailability();
      document.querySelector("#bestView").disabled=ranking||["compare","curve"].includes(affixMode);
      document.querySelector("#allView").disabled=ranking||affixMode==="curve";
      document.querySelector("#exportTable").disabled=affixMode==="curve"&&!ranking;
      document.querySelector("#metricSummary").textContent=mode==="shots"?"击杀枪数":mode==="ttk"?"TTK（首枪 0ms）":"枪械 TTK 排行";
      if(affixMode==="curve"&&!ranking){
        syncCurveAffixOptions();
        document.querySelector("#status").textContent=`射程曲线 · ${formatAffixName(curveAffixName)} · ${mode==="ttk"?"TTK":"击杀枪数"} · 悬浮查看各护甲实际结果`;
        drawTable();
      }
      else if(affixMode==="compare"&&!ranking) refreshComparison();
      else if(ranking) render();
      else drawTable();
    }
    document.querySelector("#shotsMetric").addEventListener("click",()=>setMetricMode("shots"));
    document.querySelector("#ttkMetric").addEventListener("click",()=>setMetricMode("ttk"));
    document.querySelector("#rankingMetric").addEventListener("click",()=>setMetricMode("ranking"));
    function setRankingDistance(value){
      rankingDistance=Math.round(Math.max(0,Math.min(rankingMaxDistance(),Number(value)||0))*10)/10;
      syncRankingDistanceControls();
      if(metricMode==="ranking") drawRankingTable();
    }
    document.querySelector("#rankingDistance").addEventListener("input",event=>setRankingDistance(rankingSliderToDistance(event.target.value)));
    document.querySelector("#rankingQuality").addEventListener("change",event=>{
      rankingQuality=event.target.value;
      if(rankingQuality==="紫") rankingAffixMode="none";
      else if(rankingQuality==="橙"&&rankingAffixMode==="double") rankingAffixMode="single";
      updateAffixAvailability(); render();
    });
    function selectComparisonWeapon(side,index){
      if(!weapons[index]) return;
      document.querySelector(`#comparison${side}WeaponRow`).classList.remove("open");
      document.querySelector(`#comparison${side}WeaponTrigger`).setAttribute("aria-expanded","false");
      if(side==="A") comparisonAWeaponIndex=index;
      else comparisonBWeaponIndex=index;
      syncComparisonWeaponPicker(side,index);
      if(comparisonAWeaponIndex!==comparisonBWeaponIndex) setMetricMode("ttk"); else refreshComparison();
    }
    ["A","B"].forEach(side=>{
      document.querySelector(`#comparison${side}WeaponTrigger`).addEventListener("click",()=>{
        const row=document.querySelector(`#comparison${side}WeaponRow`), open=!row.classList.contains("open");
        document.querySelectorAll(".comparison-weapon-select.open").forEach(item=>{ if(item!==row){ item.classList.remove("open"); item.querySelector(".comparison-weapon-trigger").setAttribute("aria-expanded","false"); } });
        row.classList.toggle("open",open); row.querySelector(".comparison-weapon-trigger").setAttribute("aria-expanded",String(open));
      });
      document.querySelector(`#comparison${side}WeaponMenu`).addEventListener("click",event=>{
        const option=event.target.closest(".weapon-select-option"); if(option) selectComparisonWeapon(side,+option.dataset.value);
      });
    });
    document.addEventListener("click",event=>{
      if(event.target.closest(".comparison-weapon-select")) return;
      document.querySelectorAll(".comparison-weapon-select.open").forEach(row=>{ row.classList.remove("open"); row.querySelector(".comparison-weapon-trigger").setAttribute("aria-expanded","false"); });
    });
    document.querySelector("#comparisonAQuality").addEventListener("change",event=>{comparisonAQuality=event.target.value;refreshComparison();});
    document.querySelector("#comparisonBQuality").addEventListener("change",event=>{comparisonBQuality=event.target.value;refreshComparison();});
    document.querySelector("#comparisonAAffix").addEventListener("change",event=>{comparisonAAffix=event.target.value;refreshComparison();});
    document.querySelector("#comparisonBAffix").addEventListener("change",event=>{comparisonBAffix=event.target.value;refreshComparison();});
    document.querySelector("#comparisonDistance").addEventListener("input",event=>{comparisonDistance=comparisonSliderToDistance(event.target.value);refreshComparison();});
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
