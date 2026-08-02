    function setAffixMode(mode){
      const quality=document.querySelector("#gunQuality").value;
      if(mode==="curve"){
        if(metricMode==="ranking"){
          metricMode="shots";
          ["shots","ttk","ranking"].forEach(key=>document.querySelector(`#${key}Metric`).classList.toggle("active",key==="shots"));
          document.querySelector("#singleAffix").textContent="单伤";
          document.querySelector("#doubleAffix").textContent="双伤";
          document.querySelector("#compareAffix").textContent="对比";
          document.querySelector("#metricSummary").textContent="击杀枪数";
        }
        affixMode="curve";
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
      document.querySelector("#exportTable").disabled=false;
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
    document.querySelector("#exportTable").addEventListener("click",exportStandardTable);
    document.querySelector("#exportCurve").addEventListener("click",exportCurveData);
    function setMetricMode(mode){
      metricMode=mode;
      ["shots","ttk","ranking"].forEach(key=>document.querySelector(`#${key}Metric`).classList.toggle("active",key===mode));
      const ranking=mode==="ranking";
      document.querySelector("#singleAffix").textContent=ranking?"无词条":"单伤";
      document.querySelector("#doubleAffix").textContent=ranking?"单伤":"双伤";
      document.querySelector("#compareAffix").textContent=ranking?"双伤":"对比";
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
