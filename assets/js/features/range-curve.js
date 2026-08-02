
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

