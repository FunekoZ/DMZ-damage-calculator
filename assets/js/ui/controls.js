    function applyRecommendedPreset(){
      const weaponName=weaponConfig.name;
      let mainHit="upper_chest", preset="tapfire";
      if(weaponName.startsWith("Fennec")||weaponName.startsWith("Type19")||weaponName.startsWith("J358")||weaponName.startsWith("AK47")||weaponName==="拉克曼556 (究极弹匣)"){
        mainHit="lower_arm";
        preset=weaponName==="Type19 (单点)"?"tapfire":"normal";
      }
      if(weaponName==="USS9 (究极弹匣)"){
        mainHit="legs";
        preset="custom";
      }
      if(weaponName==="ISO"){
        mainHit="upper_chest";
        preset="tapfire";
      }
      document.querySelector("#mainHit").value=mainHit;
      document.querySelector("#randomPreset").value=preset;
      applyRandomPreset(preset);
    }
    document.querySelector("#recommendPreset").addEventListener("click",()=>{
      applyRecommendedPreset();
      autoRender();
    });

    function applyWeaponQualityLimit(){
      const qualitySelect=document.querySelector("#gunQuality");
      const j358=weaponConfig.name.startsWith("J358"), uss9=weaponConfig.name.startsWith("USS9");
      [...qualitySelect.options].forEach(option=>option.disabled=(j358&&["红","究"].includes(option.value))||(uss9&&option.value==="究"));
      if(j358&&["红","究"].includes(qualitySelect.value)) qualitySelect.value="橙";
      if(uss9&&qualitySelect.value==="究") qualitySelect.value="红";
      updateAffixAvailability();
    }
    function syncWeaponPicker(index){
      const select=document.querySelector("#weaponSelect");
      select.value=String(index);
      document.querySelector("#weaponSelectTrigger").textContent=weapons[index]?.name||"选择枪械";
      document.querySelectorAll(".weapon-select-option").forEach(option=>{
        const active=+option.dataset.value===index;
        option.classList.toggle("active",active);
        option.setAttribute("aria-selected",String(active));
      });
    }
    function closeWeaponPicker(){
      document.querySelector("#weaponSelectRow").classList.remove("open");
      document.querySelector("#weaponSelectTrigger").setAttribute("aria-expanded","false");
    }
    function selectWeapon(index){
      if(!Number.isInteger(index)||!weapons[index]) return;
      const select=document.querySelector("#weaponSelect");
      select.dataset.selectedIndex=String(index);
      syncWeaponPicker(index);
      closeWeaponPicker();
      setWeapon(weapons[index]);
      applyWeaponQualityLimit();
      applyRecommendedPreset();
      autoRender();
    }
    document.querySelector("#weaponSelectTrigger").addEventListener("click",()=>{
      const row=document.querySelector("#weaponSelectRow"), open=!row.classList.contains("open");
      row.classList.toggle("open",open);
      document.querySelector("#weaponSelectTrigger").setAttribute("aria-expanded",String(open));
      if(open) document.querySelector(".weapon-select-option.active")?.scrollIntoView({block:"nearest"});
    });
    document.querySelector("#weaponSelectMenu").addEventListener("click",event=>{
      const option=event.target.closest(".weapon-select-option");
      if(option) selectWeapon(+option.dataset.value);
    });
    document.addEventListener("click",event=>{
      if(!event.target.closest("#weaponSelectRow")) closeWeaponPicker();
    });

    function updateAffixAvailability(){
      const quality=document.querySelector("#gunQuality").value;
      const ranking=metricMode==="ranking", orange=quality==="橙", purple=quality==="紫";
      const buttonIds=ranking
        ?{none:"singleAffix",single:"doubleAffix",double:"compareAffix"}
        :{single:"singleAffix",double:"doubleAffix",compare:"compareAffix",curve:"curveAffix"};
      if(ranking){
        if(purple) rankingAffixMode="none";
        else if(orange&&rankingAffixMode==="double") rankingAffixMode="single";
      } else if((orange||purple)&&!["single","curve"].includes(affixMode)){
        affixMode="single";
      }
      ["singleAffix","doubleAffix","compareAffix","curveAffix"].forEach(id=>{
        const mode=ranking?rankingAffixMode:affixMode;
        document.querySelector(`#${id}`).classList.toggle("active",id===buttonIds[mode]);
      });
      document.querySelector("#singleAffix").disabled=ranking?false:purple;
      document.querySelector("#doubleAffix").disabled=ranking?purple:orange||purple;
      document.querySelector("#compareAffix").disabled=ranking?orange||purple:orange||purple;
      document.querySelector("#curveAffix").disabled=false;
      document.querySelector("#curveAffix").hidden=false;
      document.querySelector("#curveHelpWrap").hidden=false;
      if(!ranking&&affixMode==="curve") syncCurveAffixOptions();
    }

    let autoRenderTimer = 0;
    function autoRender(){
      if(!document.querySelector("#autoCalculate").checked) return;
      clearTimeout(autoRenderTimer);
      autoRenderTimer=setTimeout(render,500);
    }

    document.querySelector("#damageRange").addEventListener("change",autoRender);
    document.querySelector("#gunQuality").addEventListener("change",()=>{
      updateAffixAvailability();
      document.querySelector("#weaponSummary").textContent=`${weaponConfig.name} · ${document.querySelector("#gunQuality").value}`;
      autoRender();
    });

    function applyRandomPreset(presetName){
      const preset=randomPresets[presetName];
      document.querySelectorAll("[data-random]").forEach(select=>{
        select.disabled=false;
        select.value=String(preset[select.dataset.random]);
      });
    }
    document.querySelector("#mainHit").addEventListener("change",autoRender);
    document.querySelector("#randomPreset").addEventListener("change",event=>{
      applyRandomPreset(event.target.value);
      autoRender();
    });
    document.querySelectorAll("[data-random]").forEach(select=>select.addEventListener("change",()=>{
      document.querySelector("#randomPreset").value="custom";
      autoRender();
    }));

