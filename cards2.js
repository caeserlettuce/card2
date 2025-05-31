 
var manatee_settings = {};

var is_host = false;
var lobby = false;
var roundpage_showing = false;
var game_stage = 0;
var round_stage = 0;
var prev_round_stage = -1;
var cards_submitted = [];

var round_data = {};
var prev_round_data = {};


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

function set_screen(name) {
  document.querySelector(".bodypage.active").classList.remove("active");
  document.querySelector(`.bodypage.${name}`).classList.add("active");
}





function join_game() {

  manatee_settings["username"] = document.querySelector(".player-name").value;
  manatee_settings["room code"] = document.querySelector(".room-code").value;

  save_localstorage();

  document.querySelector(".username-corner").innerHTML = `${manatee_settings["username"]}`;

  fetch('/join-game', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(manatee_settings)
  })
  .then(function (response) {
    return response.json();
  }).then(function (text) {
    console.log(text)
    
    if (text["verified"] == true) {
      game_stage = 1;

      if (text["is host"] == true) {
        // is host
        document.querySelector(".host-wait").style.display = "";
        document.querySelector(".nonhost-wait").style.display = "none";
      } else {
        document.querySelector(".host-wait").style.display = "none";
        document.querySelector(".nonhost-wait").style.display = "";
      }

      set_screen("waitpage");

    } else {  // NOT verified
      document.querySelector(".lobbypage .error-text").innerHTML = text["reason"];
      document.querySelector(".lobbypage .error-text").style.opacity = "1";
      setTimeout( () => {
        document.querySelector(".lobbypage .error-text").style.opacity = "";
      }, 2000)
    }

      
      
  }).catch((error) => {
    console.error("[GET] API down!", error);
  });



}


function start_game() {

  fetch('/start-game')
  .then(function (response) {

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });
}



function submit_cards(value) {

  fetch('/submit-cards', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify({"value": value, "mnt_stg": manatee_settings})
  })
  .then(function (response) {

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });

  if (value > 0) {
    // submitted
    document.querySelector(".button.submitc").classList.remove("show");
    document.querySelector(".button.usubmitc").classList.add("show");
  } else {
    // unsubmitted
    document.querySelector(".button.submitc").classList.add("show");
    document.querySelector(".button.usubmitc").classList.remove("show");
  }

}


function render_deck() {

}



function interval_function() {


  if (game_stage == 0) {  // join game screen

    if (document.querySelector(".lobbypage").classList.contains("active") == false) {

      fetch('/loading-status')
      .then(function (response) {
        return response.json();
      }).then(function (text) {
        console.log(text)
        
        if (text["lobby"] == true && game_stage == 0) {
          // LOBBY TIME!!
            set_screen("lobbypage");
        } else if (text["game running"] == true) {
          game_stage = 2; // GAME PLAY PLAY GAME
        }

      }).catch((error) => {
        console.error("[GET] API down!", error);
      });
    }
  } else if (game_stage == 1) { // waiting room

    fetch('/loading-status')
    .then(function (response) {
      return response.json();
    }).then(function (text) {
      console.log(text)
      
      if (text["game running"] == true) {
        game_stage = 2; // GAME PLAY PLAY GAME
      }


    }).catch((error) => {
      console.error("[GET] API down!", error);
    });

  } else if (game_stage == 2) {


    if (document.querySelector(".username-corner").innerHTML != `${manatee_settings["username"]}` ) {
      document.querySelector(".username-corner").innerHTML = `${manatee_settings["username"]}`;
    }

    if (roundpage_showing == false) {
      set_screen("roundpage");
      console.log("THE GAME");

      roundpage_showing = true;
    }
    
    var post_data = JSON.parse(JSON.stringify(manatee_settings));

    post_data["submitted"] = cards_submitted

    fetch('/game-status', {
      method: "POST",
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(post_data)
    })
    .then(function (response) {
      return response.json();
    }).then(function (text) {
      // console.log(text)
      round_stage = text["round stage"];
      round_data = JSON.parse(JSON.stringify(text))

      if (round_stage != prev_round_stage) {
        // ROUND STAGE IS DIFFERENT!!

        if (round_stage == 0) {
          // init round stage 0
          cards_submitted = [];
          document.querySelector(".button.submitc").classList.add("show");
          render_deck();

        } else if (round_stage == 1) {
          // init round stage 1
          document.querySelector(".button.submitc").classList.remove("show");
          document.querySelector(".button.usubmitc").classList.remove("show");

        } else if (round_stage == 2) {
          // init round stage 2
          
        }

      }


      // live visual updates below

      
      

        
      

      prev_round_stage = round_stage;
    }).catch((error) => {
      console.error("[GET] API down!", error);
    });




  }

/*
{
    "black card": {
        "cards": 1,
        "name": "that's enough _____________ for today."
    },
    "cards": [
        {
            "name": "communism"
        },
        {
            "name": "the violation of our most basic human rights"
        },
        {
            "name": "ohio"
        },
        {
            "name": "a homeless man on house arrest"
        },
        {
            "name": "obama"
        },
        {
            "name": "Boston"
        },
        {
            "name": "being buried alive"
        }
    ],
    "is manatee": true,
    "manatee": "pugface",
    "round stage": 0,
    "submitted": [],
    "users ready": []
}

*/



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


}

interval_function();
var game_tick_interval = setInterval( interval_function, 1000);


function save_game() {
  fetch('/save-game')
  .then(function (response) {

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });
}