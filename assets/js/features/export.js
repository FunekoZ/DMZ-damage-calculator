    function xmlEscape(value){
      return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
    }
    function workbookSheetName(name,index){
      const cleaned=String(name||`工作表${index+1}`).replace(/[\\/?*\[\]:]/g," ").trim()||`工作表${index+1}`;
      return cleaned.slice(0,31);
    }
    function workbookCell(value,header=false){
      const numeric=typeof value==="number"&&Number.isFinite(value);
      return `<Cell${header?' ss:StyleID="Header"':""}><Data ss:Type="${numeric?"Number":"String"}">${xmlEscape(numeric?value:String(value??""))}</Data></Cell>`;
    }
    function workbookXml(sheets){
      const worksheets=sheets.map((sheet,index)=>{
        const rows=sheet.rows.map((row,rowIndex)=>`<Row>${row.map(value=>workbookCell(value,rowIndex===0)).join("")}</Row>`).join("");
        return `<Worksheet ss:Name="${xmlEscape(workbookSheetName(sheet.name,index))}"><Table>${rows}</Table></Worksheet>`;
      }).join("");
      return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/></Style><Style ss:ID="Header"><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E5AE45" ss:Pattern="Solid"/></Style></Styles>${worksheets}</Workbook>`;
    }
    function safeDownloadName(name){ return String(name).replace(/[\\/:*?"<>|]/g,"-").replace(/\s+/g," ").trim(); }
    function downloadWorkbook(filename,sheets){
      const blob=new Blob(["﻿",workbookXml(sheets)],{type:"application/vnd.ms-excel;charset=utf-8"});
      const url=URL.createObjectURL(blob), anchor=document.createElement("a");
      anchor.href=url;
      anchor.download=`${safeDownloadName(filename)}.xls`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    function armorExportName(row){ return `${row.quality}甲 ${row.plates}格${row.variant?` ${row.variant}`:""}`; }
    function currentMetadata(extra=[]){
      const mainHit=document.querySelector("#mainHit").value, random=randomHits();
      const randomText=Object.entries(random).filter(([,count])=>count).map(([region,count])=>`${regionLabels[region]}×${count}`).join(" / ")||"无";
      return [
        ["项目","值"],
        ["枪械",metricMode==="ranking"?"全部枪械":weaponConfig.name],
        ["枪械品质",document.querySelector("#gunQuality").value],
        ["主要命中",sceneLabels[mainHit]],
        ["随机命中",randomText],
        ["当前指标",metricMode==="ttk"?"TTK（ms）":metricMode==="ranking"?"枪械排行":"击杀枪数"],
        ["射击间隔（ms）",metricMode==="ranking"?"各枪械独立":weaponConfig.shotIntervalMs],
        ...extra
      ];
    }
    function recommendedAffixText(columns,plan){
      return uniqueIndexes([...plan.recommended,...plan.rare]).map(index=>formatAffixName(columns[index].name)).join(" / ");
    }
    function exportStandardTable(){
      const metricLabel=metricMode==="shots"?"击杀枪数":"TTK（ms）", quality=document.querySelector("#gunQuality").value;
      if(metricMode==="ranking"){
        const rows=[["护甲","名次","枪械名称","实际参与品质","击杀枪数","TTK（ms）"]];
        rankingResults.forEach(row=>row.entries.forEach((entry,index)=>rows.push([armorExportName(row),index+1,entry.name,entry.quality,entry.shots,entry.ttk])));
        downloadWorkbook(`DMZ-枪械排行-${quality}-${rankingRangeLabel()}`,[{name:"枪械排行",rows},{name:"导出条件",rows:currentMetadata([["排行词条",rankingAffixMode==="none"?"无词条":rankingAffixMode==="single"?"单伤":"双伤"],["射程段",rankingRangeLabel()]])}]);
        return;
      }
      if(affixMode==="compare"){
        const rows=[["护甲",`单双伤差距（${metricLabel}）`,`单伤最优（${metricLabel}）`,"单伤词条",`双伤最优（${metricLabel}）`,"双伤词条"]];
        lastResults.forEach(row=>{
          const singlePlan=recommendationPlan(row.singleValues,row.singleEligible), doublePlan=recommendationPlan(row.doubleValues,row.doubleEligible);
          const singleValue=metricMode==="shots"?singlePlan.targetShots:(singlePlan.targetShots-1)*weaponConfig.shotIntervalMs;
          const doubleValue=metricMode==="shots"?doublePlan.targetShots:(doublePlan.targetShots-1)*weaponConfig.shotIntervalMs;
          rows.push([armorExportName(row),Math.abs(singleValue-doubleValue),singleValue,recommendedAffixText(row.singleColumns,singlePlan),doubleValue,recommendedAffixText(row.doubleColumns,doublePlan)]);
        });
        downloadWorkbook(`DMZ-单双伤对比-${weaponConfig.name}-${quality}`,[{name:"单双伤对比",rows},{name:"导出条件",rows:currentMetadata([["展示方式","单双伤对比"]])}]);
        return;
      }
      const columns=renderedColumns.length?renderedColumns:activeColumns();
      if(viewMode==="best"){
        const rows=[["护甲",metricLabel,"最优词条"]];
        lastResults.forEach(row=>{
          const plan=recommendationPlan(row.values,row.eligibleIndexes);
          const value=metricMode==="shots"?plan.targetShots:(plan.targetShots-1)*weaponConfig.shotIntervalMs;
          rows.push([armorExportName(row),value,recommendedAffixText(columns,plan)]);
        });
        downloadWorkbook(`DMZ-最优词条-${weaponConfig.name}-${quality}`,[{name:"最优词条",rows},{name:"导出条件",rows:currentMetadata([["词条类型",quality==="紫"?"无词条":affixMode==="single"?"单伤":"双伤"],["展示方式","最优词条"]])}]);
        return;
      }
      const rows=[["护甲","词条",metricLabel,"是否最优"]];
      lastResults.forEach(row=>{
        const plan=recommendationPlan(row.values,row.eligibleIndexes), recommended=new Set(plan.recommended);
        row.values.forEach((result,index)=>{
          const shots=allViewBaseline(result), value=metricMode==="shots"?shots:(shots-1)*weaponConfig.shotIntervalMs;
          rows.push([armorExportName(row),formatAffixName(columns[index].name),value,recommended.has(index)?"是":"否"]);
        });
      });
      downloadWorkbook(`DMZ-词条总表-${weaponConfig.name}-${quality}`,[{name:"词条总表",rows},{name:"导出条件",rows:currentMetadata([["词条类型",quality==="紫"?"无词条":affixMode==="single"?"单伤":"双伤"],["展示方式","总表"]])}]);
    }
    function exportCurveData(){
      const series=curveSeries(), rows=[["护甲","起始射程（米）","结束射程（米）","击杀枪数","TTK（ms）","当前指标数值"]];
      series.forEach(item=>item.points.forEach(point=>rows.push([item.label,point.min,point.max,point.shots,(point.shots-1)*weaponConfig.shotIntervalMs,point.value])));
      const quality=document.querySelector("#gunQuality").value;
      downloadWorkbook(`DMZ-曲线数据-${weaponConfig.name}-${quality}-${formatAffixName(curveAffixName)}`,[{name:"曲线真实数据",rows},{name:"导出条件",rows:currentMetadata([["曲线词条",formatAffixName(curveAffixName)],["数据来源","curveSeries().points 真实计算数据"]])}]);
    }

