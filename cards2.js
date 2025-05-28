 
var manatee_settings = {
    "game stage": 0
};


var localstorage_settings = JSON.parse(localStorage.getItem("manatee_settings"));

if (typeof localstorage_settings == typeof {} && localstorage_settings != null) {

    manatee_settings = {...localstorage_settings};
} 

function clear_settings() {
    localStorage.removeItem("manatee_settings");
}


function save_localstorage() {
    localStorage.setItem("manatee_settings", JSON.stringify(manatee_settings));
}



function toggle_button(id) {
  var enabledja = document.querySelector(`.toggle[ja_id="${id}"]`).classList.contains("enabled");
  if (enabledja == false) {
    document.querySelector(`.toggle[ja_id="${id}"]`).classList.add("enabled");      // ENABLING
    if (id == 0) {
      kilometers = true;
    }
  } else {
    document.querySelector(`.toggle[ja_id="${id}"]`).classList.remove("enabled");   // DISABLING
    if (id == 0) {
      kilometers = false;
    }
  }
}


function join_game() {

    manatee_settings["username"] = document.querySelector(".player-name").value;
    manatee_settings["room code"] = document.querySelector(".room-code").value;


    console.log(manatee_settings);
}


var game_tick_interval = setInterval( () => {


    if (manatee_settings["game stage"] == 0) {

        fetch('/loading-status')
        .then(function (response) {
          return response.json();
        }).then(function (text) {
          console.log(text)
    
    
    
        }).catch((error) => {
          console.error("[GET] API down!", error);
        });
    }
    

/*
fetch('/loading-status', {
            method: "POST",
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({"hello": "world"})
        })
        .then(function (response) {
          return response.json();
        }).then(function (text) {
          console.log(text)
    
    
    
        }).catch((error) => {
          console.error("[GET] API down!", error);
        });
*/


}, 1000);