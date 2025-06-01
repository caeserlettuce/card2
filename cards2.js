 
var manatee_settings = {};

var is_host = false;
var lobby = false;
var roundpage_showing = false;
var game_stage = 0;
var round_stage = 0;
var prev_round_stage = -1;
var cards_submitted = [];
var cards_by_id_submitted = [];

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

function jcopy(obj_in) {
  return JSON.parse(JSON.stringify(obj_in));
}

function jstr(obj_in) {
  return JSON.stringify(obj_in);
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


function king_name(name) {
  try {
    return twemoji.parse(`👑${name}`, { base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/' });
  } catch (err) {
    return `👑${name}`;
  }
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

function next_round() {

  fetch('/next-round')
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


function choose_card(card_id) {

  var prev_cards = JSON.parse(JSON.stringify(cards_by_id_submitted));

  if (card_id !== false) {
    var card_index = cards_by_id_submitted.indexOf(card_id)

    if (card_index > -1) {  // it exists so remove
      cards_by_id_submitted.splice(card_index, 1);
    } else {
      cards_by_id_submitted.push(card_id);
    }
  
    var over_length = cards_by_id_submitted.length - round_data["black card"]["cards"];
  
    if (over_length > 0) {  // chosen too many cards!
      cards_by_id_submitted.splice(0, over_length);
    }
  
    // update cards_submitted
  
    cards_submitted = [];
  
    for (i in cards_by_id_submitted) {
      var i_id = cards_by_id_submitted[i];
  
      cards_submitted.push(round_data["cards"][i_id]);
    }
  }

  // visual updates

  var remove_cards = [];

  for (i in prev_cards) {
    if (cards_by_id_submitted.indexOf(prev_cards[i]) == -1) {
      // not in new list so it must be removed
      document.querySelector(`.card.white[card-id="${prev_cards[i]}"]`).classList.remove("active");
    }
  }

  for (i in cards_by_id_submitted) {
    document.querySelector(`.card.white[card-id="${cards_by_id_submitted[i]}"]`).classList.add("active");
  }
  
}


function card_text_process(text_in) {
  
  var blank_space = `_____________`

  var text_out = `${text_in}`.replaceAll("\n", "<br>");
  text_out = text_out.replace(/_{2,}/, blank_space);
  text_out = text_out.replaceAll(blank_space, `<span style="display: inline-block">${blank_space}</span>`);

  text_out = text_out.replaceAll("_", `<span style="display: inline-block; transform: scale(1.1, 1);">_</span>`);
  // this makes every underscore just a little bit wider so they all become one big underscore


  return text_out
}


function render_black_card(text_in=false) {

  if (text_in == false) {
    text_in = round_data["black card"]["name"];
  }
  
  document.querySelector(".roundpage .card.black h2").innerHTML = card_text_process(text_in);
}


function render_deck() {

  document.querySelector(".choice-zone").innerHTML = "";

  for (i in round_data["cards"]) {

    var card_node = document.querySelector(".templates .card.white.template").cloneNode(true);

    card_node.classList.remove("template");
    card_node.classList.add("hoverable");
    card_node.setAttribute("onclick", `choose_card(${i})`);
    card_node.setAttribute("card-id", `${i}`);
    card_node.querySelector("h2").innerHTML = card_text_process(round_data["cards"][i]["name"]);

    document.querySelector(".choice-zone").appendChild(card_node);

  }

}

function render_submissions(explosions=false) {
  for (pl in round_data["submitted"]) {

    if (pl != round_data["manatee"]) {

      var pl_node = document.createElement("div");

      pl_node.classList.add("card-group");
      pl_node.classList.add("col");
      pl_node.setAttribute("group-id", `${pl}`);

      if (round_data["is manatee"] == true && explosions == false) {

        pl_node.classList.add("hoverable");
        pl_node.setAttribute("onclick", `vote_card('${pl}')`);

      }

      var winner_crown = `${pl}`;
      var is_winner = false;

      if (round_data["winner"]) {
        if (pl == round_data["winner"]) {
          winner_crown = king_name(`${pl}`);
          is_winner = true;
        }
      }

      pl_node.innerHTML = `<h3>${winner_crown}</h3><div class="card-group"> </div>`;

      console.log(round_data["submitted"])

      for (c in round_data["submitted"][pl]) {

        var card_node = document.querySelector(".templates .card.white").cloneNode(true);
        console.log(card_node);
        card_node.classList.remove("template");
        card_node.querySelector("h2").innerHTML = card_text_process(round_data["submitted"][pl][c]["name"]);
        
        if (explosions == true && is_winner == false) {
          var explosion_node = document.createElement("img");
          explosion_node.setAttribute("src", `assets/explosion.gif`);
          explosion_node.classList.add("explosion");
          card_node.append(explosion_node);
        }
        
        pl_node.querySelector(".card-group").appendChild(card_node);
      
      }


      twemoji.parse(pl_node);

      document.querySelector(".choice-zone").appendChild(pl_node);

    }
  }
}


function end_round() {

  fetch('/end-round')
  .then(function (response) {

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });

}


function vote_card(player_in) {

  var data_out = jcopy(manatee_settings);
  data_out["vote"] = player_in;

  fetch('/vote-card', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(data_out)
  })
  .then(function (response) {

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });

}



function interval_function() {


  if (game_stage == 0) {  // join game screen

    if (document.querySelector(".lobbypage").classList.contains("active") == false) {

      fetch('/loading-status', {
        method: "POST",
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(manatee_settings)
      })
      .then(function (response) {
        return response.json();
      }).then(function (text) {
        console.log(text)

        if (text["lobby"] == true && game_stage == 0) {
          // LOBBY TIME!!
            set_screen("lobbypage");
            game_stage = 1;
        } else if (text["game running"] == true && text["get out"] == false) {
          game_stage = 2; // GAME PLAY PLAY GAME
        }

        if (text["get out"] == true) {
          clear_settings();
          set_screen("lobbypage");
          game_stage = 1;
          console.log("get out");
        }
        
        

      }).catch((error) => {
        console.error("[GET] API down!", error);
      });
    }
  } else if (game_stage == 1) { // waiting room

    fetch('/loading-status', {
      method: "POST",
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(manatee_settings)
    })
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

        var buttonarea_items = document.querySelectorAll(".buttons .defaulthide.show");

        for (i in buttonarea_items) {
          if (typeof buttonarea_items[i] == typeof document.querySelector("body")) {
            buttonarea_items[i].classList.remove("show");
          }
        }

        document.querySelector(".choice-zone").innerHTML = "";

        if (round_stage == 0) {         // init round stage 0
          cards_submitted = [];

          if (round_data["is manatee"] == false) {  // for people who are NOT the manatee

            document.querySelector(".button.submitc").classList.add("show");

            if (round_data["users ready"].includes(manatee_settings["username"])) {
              document.querySelector(".button.submitc").classList.remove("show");
              document.querySelector(".button.usubmitc").classList.add("show");
            }
            
  
            render_black_card();
            render_deck();
            choose_card(false); // will just run the visual updates portion of the function

            document.querySelector("span.card-number").innerHTML = `${round_data["black card"]["cards"]}`;
            if (round_data["black card"]["cards"] > 1) {
              document.querySelector("span.card-number-plural").innerHTML = "s";
            } else {
              document.querySelector("span.card-number-plural").innerHTML = "";
            }
            document.querySelector("p.card-number").classList.add("show");

          } else {  // for the manatee

            document.querySelector("p.card-number").classList.remove("show");
            document.querySelector(".button.endround").classList.add("show");
            document.querySelector("p.plreadytext").classList.add("show");

            render_black_card();

          }

          




        } else if (round_stage == 1) {  // init round stage 1
          document.querySelector(".button.submitc").classList.remove("show");
          document.querySelector(".button.usubmitc").classList.remove("show");

          render_black_card();

          render_submissions();

        } else if (round_stage == 2) {  // init round stage 2
          
          document.querySelector(".plwinnertext").innerHTML = `${round_data["winner"]} won this round!`;
          document.querySelector(".plwinnertext").classList.add("show");
          document.querySelector(".button.nextround").classList.add("show");

          render_black_card();
          render_submissions(true);
          
        }


      }


      // live visual updates below

      if (round_stage == 0) {

        if (round_data["is manatee"] == true) {
          // player list ready list player

          if (jstr(round_data["users ready"]) != jstr(prev_round_data["users ready"])) {
            
            document.querySelector(".choice-zone").innerHTML = "";

            for (p in round_data["users ready"]) {
              var pname_node = document.querySelector(".templates .playername").cloneNode(true);

              pname_node.classList.remove("template");
              pname_node.innerHTML = `${round_data["users ready"][p]}`;

              if (round_data["users ready"].length == round_data["players"].length - 1) {
                // all players ready!
                pname_node.classList.add("green");
              }

              document.querySelector(".choice-zone").appendChild(pname_node);

            }
            

          }

        }

      } else if (round_stage == 1) {


      } else if (round_stage == 2) {


      }

        
      
      prev_round_data = JSON.parse(JSON.stringify(round_data));
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