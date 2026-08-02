
    let weapons = BUILT_IN_WEAPONS;
    let weaponConfig = validateWeapon(BUILT_IN_WEAPONS[0]);
    let lastResults = [];
    let renderedColumns = [];
    let excludedColumns = [];
    let viewMode = "best";
    let viewAfterRender = null;
    let metricMode = "shots";
    let rankingResults = [];
    let rankingAffixMode = "single";
    let affixMode = "single";
    let curveAffixName = "无词条";
    let curveResizeFrame = 0;
    const CURVE_QUALITY_COLORS = {紫:"#9085e9",橙:"#c97832",红:"#c84c91",究:"#c98500"};
    const CURVE_SATURATION_FACTORS = [1,.68,.38,.16];
    const CURVE_DASHES = ["","7 3","3 3","10 3 2 3","2 3","8 2","5 2 1 2","1 3","9 4","4 4","12 3"];
    const CURVE_ARMOR_GROUPS = [
      {quality:"紫",label:"紫甲"},
      {quality:"橙",label:"橙甲"},
      {quality:"红",label:"红甲"},
      {quality:"究",label:"究甲"}
    ];
