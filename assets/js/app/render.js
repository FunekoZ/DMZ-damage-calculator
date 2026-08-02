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
