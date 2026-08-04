    const HEALTH = 100, ARMOR_PER_PLATE = 50, SAMPLES = 5000, RANKING_SAMPLES = 100;
    const levels = { 紫: 0, 橙: 1, 红: 2, 究: 3 };
    const qualityMultipliers = { "-3": .5, "-2": .7, "-1": .85, "0": 1, "1": 1.1, "2": 1.2, "3": 1.3 };
    const armors = [
      {quality:"紫",plates:1,armorType:"全包"}, {quality:"紫",plates:2,armorType:"半包"}, {quality:"紫",plates:3,armorType:"躯干"},
      {quality:"橙",plates:2,armorType:"全包"}, {quality:"橙",plates:3,armorType:"半包"},
      {quality:"红",plates:3,armorType:"全包"}, {quality:"红",plates:4,armorType:"半包"},
      {quality:"究",plates:3,armorType:"全包",variant:"β",health:200},
      {quality:"究",plates:4,armorType:"全包",variant:"γ / δ"},
      {quality:"究",plates:4,armorType:"全包",variant:"黑曜石",immuneFirstShot:true},
      {quality:"究",plates:6,armorType:"全包",variant:"α"}
    ];
    const regionLabels = { upper_chest:"上胸", abdomen:"腹部", head:"头部", upper_arm:"上臂", lower_arm:"下臂", legs:"腿部" };
    const sceneLabels = { lower_arm:"下臂 / 正面对枪", upper_arm:"上臂 / 侧面偷袭", upper_chest:"上胸 / 背面偷袭", head:"头部 / 掩体对狙", legs:"腿部 / 专业修脚" };
    const randomPresets = {
      normal:{lower_arm:0,upper_arm:0,upper_chest:2,abdomen:0,legs:0,head:0},
      crouch:{lower_arm:0,upper_arm:0,upper_chest:0,abdomen:1,legs:2,head:0},
      headshot:{lower_arm:0,upper_arm:0,upper_chest:1,abdomen:0,legs:0,head:1},
      tapfire:{lower_arm:0,upper_arm:1,upper_chest:1,abdomen:0,legs:0,head:0},
      custom:{lower_arm:0,upper_arm:0,upper_chest:0,abdomen:0,legs:0,head:0}
    };
    const affixes = {
      1:["上半0.2","upper_body"], 2:["躯干0.2","torso"], 3:["手臂0.2","arms"], 4:["头部0.3","head03"],
      5:["头部0.5","head05"], 6:["腿部0.2","legs"], 7:["破甲","armorBreak"], 8:["肉伤","flesh"]
    };
    const combinations = [[1,2],[1,3],[1,4],[1,6],[1,7],[2,5],[3,5],[4,5],[6,5],[2,7],[2,8],[3,7],[3,8],[4,7],[4,8],[7,8]];
    const makeColumn = nums => ({
      name: nums.map(n => affixes[n][0]).join("+"),
      effects: nums.map(n => affixes[n][1]).filter(x => !["armorBreak","flesh"].includes(x)),
      armorBreak: nums.includes(7), flesh: nums.includes(8)
    });
    const singleColumns = Object.keys(affixes).map(n=>makeColumn([+n]));
    const doubleColumns = combinations.map(makeColumn);
    function qualityColumnName(name,quality){
      if(quality!=="橙") return name;
      return name
        .replaceAll("上半0.2","上半0.1")
        .replaceAll("躯干0.2","躯干0.1")
        .replaceAll("手臂0.2","手臂0.1")
        .replaceAll("腿部0.2","腿部0.1")
        .replaceAll("头部0.3","头部0.1")
        .replaceAll("头部0.5","头部0.3");
    }
    function columnsForQuality(columns,quality){
      return columns.map(column=>({...column,name:qualityColumnName(column.name,quality)}));
    }
    function activeColumns(){
      const quality=document.querySelector("#gunQuality").value;
      const noAffix={name:"无词条",effects:[],armorBreak:false,flesh:false};
      if(quality==="紫") return [noAffix];
      if(quality==="橙" && affixMode!=="single") return [noAffix, ...columnsForQuality(singleColumns,quality)];
      if(affixMode==="compare") return [];
      if(affixMode==="double") return columnsForQuality(doubleColumns,quality);
      return [noAffix, ...columnsForQuality(singleColumns,quality)];
    }
