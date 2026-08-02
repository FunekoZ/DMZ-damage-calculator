    function validateWeapon(weapon){
      const regions=["head","upper_chest","abdomen","upper_arm","lower_arm","legs"];
      const shotInterval=Number(weapon?.shot_interval_ms);
      const projectiles=weapon?.projectiles_per_shot===undefined?1:Number(weapon.projectiles_per_shot);
      const builtInFleshRatio=weapon?.built_in_flesh_ratio===undefined?0:Number(weapon.built_in_flesh_ratio);
      const unarmoredDamageMultiplier=weapon?.unarmored_damage_multiplier===undefined?1:Number(weapon.unarmored_damage_multiplier);
      if(!weapon || typeof weapon.name!=="string" || !weapon.name.trim() || !Number.isFinite(shotInterval) || shotInterval<=0) throw new Error("枪械 JSON 的名称或射击间隔无效");
      if(!Number.isInteger(projectiles)||projectiles<1) throw new Error("枪械 JSON 的每次开火弹丸数必须是大于等于 1 的整数");
      if(!Number.isFinite(builtInFleshRatio)||builtInFleshRatio<0||builtInFleshRatio>1) throw new Error("枪械 JSON 的自带肉伤比例必须在 0 到 1 之间");
      if(!Number.isFinite(unarmoredDamageMultiplier)||unarmoredDamageMultiplier<=0) throw new Error("枪械 JSON 的无甲伤害倍率必须是正数");
      if(!weapon.region_multipliers || regions.some(r=>!Number.isFinite(Number(weapon.region_multipliers[r]))||Number(weapon.region_multipliers[r])<=0)) throw new Error("枪械 JSON 缺少有效的部位倍率");
      const damageRanges=weapon.damage_ranges;
      if(!Array.isArray(damageRanges)||!damageRanges.length) throw new Error("枪械 JSON 缺少射程伤害配置");
      if(damageRanges.some(range=>!Number.isFinite(Number(range.min))||!Number.isFinite(Number(range.max))||!Number.isFinite(Number(range.damage))||Number(range.min)<0||Number(range.max)<=Number(range.min)||Number(range.damage)<=0)) throw new Error("枪械 JSON 的射程伤害配置无效");
      return { name:weapon.name.trim(), shotIntervalMs:shotInterval, projectilesPerShot:projectiles, builtInFleshRatio, unarmoredDamageMultiplier, damageRanges:damageRanges.map(range=>({min:Number(range.min),max:Number(range.max),damage:Number(range.damage)})), multipliers:Object.fromEntries(regions.map(r=>[r,Number(weapon.region_multipliers[r])])) };
    }
    function rangeLabel(range){
      const end=range.max;
      return `约 ${range.min} – ${end} 米 · ${range.damage} 伤害`;
    }
    function updateDamageRanges(){
      const select=document.querySelector("#damageRange");
      select.replaceChildren(...weaponConfig.damageRanges.map((range,index)=>new Option(rangeLabel(range),String(index))));
    }
    function setWeapon(weapon){
      weaponConfig=validateWeapon(weapon);
      const quality=document.querySelector("#gunQuality").value;
      document.querySelector("#weaponSummary").textContent=`${weaponConfig.name} · ${quality}`;
      updateDamageRanges();
      if(affixMode==="curve") syncCurveAffixOptions();
    }
    function isUltimateWeapon(name){
      if(name.includes("无究极")||name.includes("无弹匣")||name.includes("单点")||name.includes("倍率枪管")) return false;
      return name.includes("究极")||name.includes("射程枪管")||name.includes("全自动");
    }
    function weaponOption(item){
      const button=document.createElement("button");
      button.type="button";
      button.className="weapon-select-option";
      button.dataset.value=String(item.index);
      button.setAttribute("role","option");
      button.textContent=item.config.name;
      button.title=item.config.name;
      return button;
    }
    function weaponGroup(title,items){
      const group=document.createElement("div");
      group.className="weapon-select-group";
      const heading=document.createElement("span");
      heading.className="weapon-select-group-title";
      heading.textContent=title;
      group.append(heading,...items.map(weaponOption));
      return group;
    }
    function populateWeapons(items){
      const validated=items.map((weapon,index)=>{
        try { return {raw:weapon,config:validateWeapon(weapon),index}; }
        catch(error){ throw new Error(`第 ${index+1} 个枪械配置无效：${error.message}`); }
      });
      weapons=validated.map(item=>item.raw);
      const select=document.querySelector("#weaponSelect");
      select.replaceChildren(...validated.map(item=>new Option(item.config.name,String(item.index))));
      const selectedIndex=Math.min(+select.dataset.selectedIndex||0,weapons.length-1);
      select.value=String(selectedIndex);
      const menu=document.querySelector("#weaponSelectMenu");
      menu.replaceChildren(
        weaponGroup("带究极配件",validated.filter(item=>isUltimateWeapon(item.config.name))),
        weaponGroup("不带究极配件",validated.filter(item=>!isUltimateWeapon(item.config.name)))
      );
      syncWeaponPicker(selectedIndex);
      setWeapon(weapons[selectedIndex]);
      applyWeaponQualityLimit();
    }
    async function loadWeapons(){
      // 回退数据脚本已内置完整枪械配置，双击打开时无需读取外部文件。
      if(location.protocol==="file:") return;
      try {
        const response=await fetch("weapons.json", {cache:"no-store"});
        if(!response.ok) throw new Error();
        const items=await response.json();
        if(!Array.isArray(items)||!items.length) throw new Error();
        const select=document.querySelector("#weaponSelect");
        select.dataset.selectedIndex=select.value;
        populateWeapons(items);
        render();
      } catch {
        // 保留已经内置并渲染的完整枪械数据。
      }
    }
