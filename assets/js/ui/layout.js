    function syncDesktopResultHeight(){
      const results=document.querySelector(".results");
      if(window.innerWidth<=1050){ results.style.height=""; return; }
      const controlsHeight=document.querySelector("#controls").offsetHeight;
      const summaryHeight=document.querySelector(".summary").offsetHeight;
      results.style.height=`${Math.max(320,controlsHeight-summaryHeight-14)}px`;
    }
    new ResizeObserver(syncDesktopResultHeight).observe(document.querySelector("#controls"));
    new ResizeObserver(syncDesktopResultHeight).observe(document.querySelector(".summary"));
    window.addEventListener("resize",syncDesktopResultHeight);

    function syncDesktopRowHeights(){
      document.querySelectorAll("#resultTable th, #resultTable td").forEach(cell=>cell.style.height="");
    }
    window.addEventListener("resize",syncDesktopRowHeights);

    function armorDisplay(row){
      const full=`<span class="armor-full"><span>${row.quality}甲</span><span class="armor-detail">${row.plates}格${row.variant?` ${row.variant}`:""}</span></span>`;
      const compact=row.quality==="究"?`${row.plates}${row.variant?` ${row.variant}`:""}`:String(row.plates);
      return `<span class="armor ${armorClass(row.quality)}">${full}<span class="armor-compact">${compact}</span></span>`;
    }

