    const customSelectInstances=new WeakMap();
    function customSelectOptionButton(option,select){
      const button=document.createElement("button");
      button.type="button";
      button.className="custom-select-option";
      button.dataset.value=option.value;
      button.textContent=option.textContent;
      button.title=option.textContent;
      button.disabled=option.disabled;
      button.classList.toggle("active",option.value===select.value);
      button.setAttribute("role","option");
      button.setAttribute("aria-selected",String(option.value===select.value));
      return button;
    }
    function refreshCustomSelect(select){
      const instance=customSelectInstances.get(select);
      if(!instance) return;
      const selected=select.selectedOptions[0];
      instance.trigger.textContent=selected?.textContent||"请选择";
      instance.trigger.disabled=select.disabled;
      instance.menu.replaceChildren(...[...select.options].map(option=>customSelectOptionButton(option,select)));
    }
    function closeCustomSelect(instance){
      instance.row.classList.remove("open");
      instance.trigger.setAttribute("aria-expanded","false");
    }
    function enhanceSelect(select){
      if(customSelectInstances.has(select)||select.id==="weaponSelect"||select.closest(".comparison-weapon-select")) return;
      const row=document.createElement("div"); row.className="custom-select";
      const trigger=document.createElement("button"); trigger.type="button"; trigger.className="custom-select-trigger"; trigger.setAttribute("aria-haspopup","listbox"); trigger.setAttribute("aria-expanded","false");
      const menu=document.createElement("div"); menu.className="custom-select-menu"; menu.setAttribute("role","listbox");
      select.parentNode.insertBefore(row,select); row.append(select,trigger,menu); select.classList.add("custom-select-native");
      const instance={select,row,trigger,menu}; customSelectInstances.set(select,instance); refreshCustomSelect(select);
      trigger.addEventListener("click",()=>{
        const opening=!row.classList.contains("open");
        document.querySelectorAll(".custom-select.open").forEach(item=>{ if(item!==row) closeCustomSelect(customSelectInstances.get(item.querySelector("select"))); });
        row.classList.toggle("open",opening); trigger.setAttribute("aria-expanded",String(opening));
        if(opening){ refreshCustomSelect(select); menu.querySelector(".active")?.scrollIntoView({block:"nearest"}); }
      });
      menu.addEventListener("click",event=>{
        const option=event.target.closest(".custom-select-option");
        if(!option||option.disabled) return;
        select.value=option.dataset.value; refreshCustomSelect(select); closeCustomSelect(instance);
        select.dispatchEvent(new Event("change",{bubbles:true}));
      });
      select.addEventListener("change",()=>refreshCustomSelect(select));
      new MutationObserver(()=>refreshCustomSelect(select)).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled","selected","label"]});
    }
    function enhanceAllSelects(root=document){ root.querySelectorAll("select").forEach(enhanceSelect); }
    function syncCustomSelect(selectOrSelector){
      const select=typeof selectOrSelector==="string"?document.querySelector(selectOrSelector):selectOrSelector;
      if(select) refreshCustomSelect(select);
    }
    document.addEventListener("click",event=>{
      if(event.target.closest(".custom-select")) return;
      document.querySelectorAll(".custom-select.open").forEach(row=>closeCustomSelect(customSelectInstances.get(row.querySelector("select"))));
    });
    enhanceAllSelects();
