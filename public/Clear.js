

let myelement=document.getElementById("toggleBtn");

myelement.addEventListener('click',showClear);

function showClear() {
    let x = document.getElementById("mot_de_passe");
    if (x.type === "password") {
      x.type = "text";
    } else {
      x.type = "password";
    }
};

