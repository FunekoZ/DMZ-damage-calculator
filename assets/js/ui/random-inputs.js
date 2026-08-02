
    const randomInputs = document.querySelector("#randomInputs");
    Object.entries(regionLabels).forEach(([key,label]) => randomInputs.insertAdjacentHTML("beforeend", `<label class="random-grid"><span>${label}</span><select data-random="${key}"><option${key==="upper_chest"?"":" selected"}>0</option><option${key==="upper_chest"?" selected":""}>1</option><option>2</option></select></label>`));
