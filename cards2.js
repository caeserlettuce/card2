 
var manatee_settings = {};

var is_host = false;
var lobby = false;
var roundpage_showing = false;
var game_stage = 0;
var round_stage = 0;
var prev_round_stage = -1;
var cards_submitted = [];
var cards_by_id_submitted = [];

var joined_players = {};
var prev_joined_players = {};

var round_data = {};
var prev_round_data = {};

var manatee_rotating = false;
var random_hand = false;
var cardpack_list = [];
var packs_enabled = [];
var cardpack_edit = {};
var edit_scroll  = false;
var edit_scroll_bottom = false;
var cardpack_url = "";
var selected_card_id = false;
var selected_card = {
  "original": {},
  "new": {}
};
var card_removed = {
  "id": false,
  "black": false
}
var reselect_card = false;
var rf_black = false;
var rf_card = {};

var windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
var windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
var mobile = false
var mobile_interval;
var name_bounding_box;
var prev_bounding_box;

var get_out_tm = false;



if (windowHeight > windowWidth) {
  var elem = document.createElement("link");
  elem.setAttribute("rel", "stylesheet");
  elem.setAttribute("href", "assets/mobile.css");
  document.head.appendChild(elem);
  mobile = true;

  mobile_interval = setInterval( () => {

    var name_bounding_box = document.querySelector(".username-corner").getBoundingClientRect();

    var name_height = name_bounding_box.top + name_bounding_box.height + 15;

      document.querySelector(".mobile-scroll-fix").innerHTML = `
      .roundpage {
          max-height: ${windowHeight}px;
      }
          `;

  }, 1000)
}


document.querySelector(".info-pane input.card-name").addEventListener("keydown", (e) => {
  if (e.which == 13) {
    reselect_card = true;
    save_card_change();
  }
})
document.querySelector(".info-pane input.cards-amt").addEventListener("keydown", (e) => {
  if (e.which == 13) {
    reselect_card = true;
    save_card_change();
  }
})

document.querySelector(".player-name").addEventListener("keydown", (e) => {
  if (e.which == 13) {
    document.querySelector(".room-code").focus();
  }
});
document.querySelector(".room-code").addEventListener("keydown", (e) => {
  if (e.which == 13) {
    join_game();
  }
})


var localstorage_settings = JSON.parse(localStorage.getItem("manatee_settings"));

console.log("HELLO", localstorage_settings);

if (typeof localstorage_settings == typeof {} && localstorage_settings != null) {

  if (typeof localstorage_settings["username"] != typeof "hello") {
    localstorage_settings["username"] = false;
    console.log("username missing from localstorage!");
  }
  if (typeof localstorage_settings["room code"] != typeof "hello") {
    localstorage_settings["room code"] = false;
    console.log("room code missing from localstorage!");
  }

  manatee_settings = {...localstorage_settings};
} else {
  console.log("NOOOOO")
  manatee_settings = {
    "username": false,
    "room code": false
  }
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


//this is for updating the list of players ready in the hosts' intro screen
function update_joined_players() {
  /*var pname_node = document.querySelector(".templates .playername").cloneNode(true);

  pname_node.classList.remove("template");
  pname_node.innerHTML = `${player}`;
  document.querySelector("player-list").appendChild(pname_node);*/
}

function set_settings_init(settings_in) {

  if (settings_in["rotating"] == true) {
    toggle_button(0);
  }
  if (settings_in["random hand"] == true) {
    toggle_button(1);
  }

  document.querySelector("input.hand-size").value = settings_in["hand size"];

}

function set_setting(key, value) {

  var data_in = jcopy(manatee_settings)
  data_in["setting"] = key;
  data_in["value"] = value;

  fetch('/set-setting', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(data_in)
  })
  .then(function (response) {

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });


}


function toggle_button(id) {
  var enabledja = document.querySelector(`.toggle[ja_id="${id}"]`).classList.contains("enabled");
  if (enabledja == false) {
    document.querySelector(`.toggle[ja_id="${id}"]`).classList.add("enabled");      // ENABLING
    if (id == 0) {
      set_setting("rotating", true);
      document.querySelector(`.toggle-wrapper span[ja_id="0"]`).innerHTML = "manatee order: rotating";
    } else if (id == 1) {
      set_setting("random hand", true);
      document.querySelector(`.toggle-wrapper span[ja_id="1"]`).innerHTML = "random hand every time";
    }
  } else {
    document.querySelector(`.toggle[ja_id="${id}"]`).classList.remove("enabled");   // DISABLING
    if (id == 0) {
      set_setting("rotating", false);
      document.querySelector(`.toggle-wrapper span[ja_id="0"]`).innerHTML = "manatee order: winner";
    } else if (id == 1) {
      set_setting("random hand", false);
      document.querySelector(`.toggle-wrapper span[ja_id="1"]`).innerHTML = "keep cards between rounds";
    }
  }
}

function update_hand_size_setting() {
  var hand_size = parseInt(document.querySelector("input.hand-size").value);
  if (hand_size != NaN && hand_size > 0) {
    set_setting("hand size", hand_size);
  }
}


function set_screen(name) {
  document.querySelector(".bodypage.active").classList.remove("active");
  document.querySelector(`.bodypage.${name}`).classList.add("active");
}

function open_card_picker() {

  // card picker

  var data_out = jcopy(manatee_settings);
  
  fetch('/get-cardpacks', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(data_out)
  })
  .then(function (response) {
    return response.json();
  }).then(function (text) {
    // console.log(text)
    cardpack_list = jcopy(text["packs"]);
    packs_enabled = jcopy(text["enabled"]);

    cardpack_list.sort();

    set_screen("cardpackpage");

    // display cardpacks

    document.querySelector(".packlist").innerHTML = "";

    for (i in cardpack_list) {

      var pack_node = document.querySelector(".templates .pack.template").cloneNode(true);
      pack_node.classList.remove("template");
      pack_node.querySelector("svg").setAttribute("onclick", `toggle_pack('${cardpack_list[i]}')`);
      pack_node.querySelector("svg").setAttribute("pa_id", `${cardpack_list[i]}`);
      pack_node.querySelector("p").setAttribute("onclick", `edit_pack('${cardpack_list[i]}')`);
      pack_node.querySelector("span").innerHTML = `${cardpack_list[i]}`;

      document.querySelector(".packlist").appendChild(pack_node);

      if (packs_enabled.includes(`${cardpack_list[i]}`)) {
        pack_node.querySelector("svg").classList.add("enabled");
      }
    }


      
  }).catch((error) => {
    console.error("[GET] API down!", error);
  });
  




}

function toggle_pack(id) {
  var enabledja = document.querySelector(`.toggle[pa_id="${id}"]`).classList.contains("enabled");
  if (enabledja == false) {
    document.querySelector(`.toggle[pa_id="${id}"]`).classList.add("enabled");      // ENABLING
  } else {
    document.querySelector(`.toggle[pa_id="${id}"]`).classList.remove("enabled");   // DISABLING
  }

  enabledja = !enabledja;

  var data_out = jcopy(manatee_settings);
  data_out["pack"] = id;
  data_out["bool"] = enabledja;

  fetch('/toggle-cardpack', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(data_out)
  })
  .then(function (response) {
      
  }).catch((error) => {
    console.error("[GET] API down!", error);
  });
}



function make_cardlist_header(black) {

  var out_node = document.querySelector(".templates .list-header.template").cloneNode(true);
  out_node.classList.remove("template");
  if (black == true) {
    out_node.classList.add("black");
    out_node.querySelector("h3").innerHTML = "black cards";
    out_node.querySelector(".rapid-fire").setAttribute("onclick", "rapid_fire(true)");
    out_node.querySelector(".rapid-fire").innerHTML = "add black cards";
  } else {
    out_node.classList.add("white");
    out_node.querySelector("h3").innerHTML = "white cards";
    out_node.querySelector(".rapid-fire").setAttribute("onclick", "rapid_fire(false)");
    out_node.querySelector(".rapid-fire").innerHTML = "add white cards";
  }

  var real_out_node = document.createElement("div");
  real_out_node.classList.add("list-header-sticky");
  real_out_node.appendChild(out_node)
  return real_out_node
}

function make_cardlist_entry(name, id, black) {

  var out_node = document.querySelector(".templates .card-entry.template").cloneNode(true);
  out_node.classList.remove("template");
  out_node.querySelector("h3").innerHTML = name;
  out_node.querySelector(".button").setAttribute("onclick", `remove_card(${id}, ${black})`);
  out_node.setAttribute("c-id", `${id}`)
  
  out_node.addEventListener('click', (e) => {
    if (typeof e.target == typeof document.body) {
      if (e.target.classList.contains("button") == false) {

        var is_black = false;
        if (e.target.classList.contains("black")) {
          is_black = true;
        }
        var c_id = parseInt(e.target.getAttribute("c-id"));
        entry_click(c_id, is_black);
      }
    }
  });
  out_node.addEventListener('mouseover', (e) => {
    if (typeof e.target == typeof document.body) {

      var target = e.target;

      if (target.classList.contains("button")) {
        target = target.parentNode;
      }
        
      var is_black = false;
      if (target.classList.contains("black")) {
        is_black = true;
      }
      var c_id = parseInt(target.getAttribute("c-id"));
      entry_hover(c_id, is_black);
      
    }
  });
  out_node.addEventListener('mouseout', (e) => {
    if (typeof e.target == typeof document.body) {

      render_current_card_selection();
      
    }
  });

  if (black == true) {
    out_node.classList.add("black");
  } else {
    out_node.classList.add("white");
  }
  return out_node
}

function save_card_change() {

  if (selected_card["original"]["name"]) {

    var og = selected_card["original"];
    
    var card_name = document.querySelector(".info-pane input.card-name").value;
    var cards_amt = document.querySelector(".info-pane input.cards-amt").value;

    if (selected_card["original"]["cards"]) {
      // black card
      cards_amt = parseInt(cards_amt);
      if (cards_amt != NaN) {
        // NOT nan
        if (cards_amt > 0) {
          // yay
          console.log("cards_amt good!");
        } else {
          cards_amt = og["cards"];  
        }
      } else {
        cards_amt = og["cards"];
      }
      selected_card["new"]["cards"] = cards_amt;
    }

    card_name = card_name.replaceAll("<br>", "\n");

    selected_card["new"]["name"] = card_name;

    if (JSON.stringify(selected_card["new"]) != JSON.stringify(selected_card["original"]) && selected_card["new"]["name"] != "") {
      // change!
      console.log("save card change!");
      console.log(selected_card);

      var data_out = jcopy(manatee_settings);
  
      data_out["change"] = selected_card;
      data_out["pack"] = cardpack_url;  

      fetch('/edit-card', {
        method: "POST",
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify(data_out)
      })
      .then(function (response) {
        return response.json();
      }).then(function (text) {
        console.log(text)
    
        if (text["edited"]) {
          if (text["edited"] == true) {
            edit_pack(cardpack_url, true);
          }
        }
    
          
      }).catch((error) => {
        console.error("[GET] API down!", error);
      });

    }
    
  }

}


function render_info_card(name, black) {

  if (black == true) {
    document.querySelector(".info-pane .card").classList.remove("white");
    document.querySelector(".info-pane .card").classList.add("black");
    document.querySelector(".info-pane .card h2").innerHTML = card_text_process(name);

    document.querySelector(".rapidfire .card").classList.remove("white");
    document.querySelector(".rapidfire .card").classList.add("black");
    document.querySelector(".rapidfire .card h2").innerHTML = card_text_process(name);
    
  } else {
    document.querySelector(".info-pane .card").classList.add("white");
    document.querySelector(".info-pane .card").classList.remove("black");
    document.querySelector(".info-pane .card h2").innerHTML = card_text_process(name);

    document.querySelector(".rapidfire .card").classList.add("white");
    document.querySelector(".rapidfire .card").classList.remove("black");
    document.querySelector(".rapidfire .card h2").innerHTML = card_text_process(name);

  }
}

function render_current_card_selection() {

  if (selected_card["new"]["name"]) {
    var is_black = false;
    if (selected_card["original"]["cards"]) {
      is_black = true;
    }
  
    render_info_card(selected_card["new"]["name"], is_black);
  }
  
}

function entry_click(id, black, dont_save=false) {

  if (dont_save == false) {
    save_card_change();
  }

  selected_card_id = id;

  if (black == true) {
    selected_card = {
      "original": jcopy(cardpack_edit["black"][id]),
      "new": jcopy(cardpack_edit["black"][id])
    }
  } else {
    selected_card = {
      "original": jcopy(cardpack_edit["white"][id]),
      "new": jcopy(cardpack_edit["white"][id])
    }
  }
  

  var card_data = {};


  try {
    document.querySelector(`.card-entry.active`).classList.remove("active");
  } catch (err) {

  }
  
  setTimeout(() => {

    if (black == true) {
      card_data = cardpack_edit["black"][id];
      document.querySelector(".info-pane input.cards-amt").disabled = false;
      document.querySelector(".info-pane input.card-name").value = cardpack_edit["black"][id]["name"];
      document.querySelector(".info-pane input.cards-amt").value = cardpack_edit["black"][id]["cards"];
      render_info_card(cardpack_edit["black"][id]["name"], true);
      
      document.querySelector(`.card-entry.black[c-id="${id}"]`).classList.add("active");
    } else {
      card_data = cardpack_edit["white"][id];
      document.querySelector(".info-pane input.cards-amt").disabled = true;
      document.querySelector(".info-pane input.cards-amt").value = "";
      document.querySelector(".info-pane input.card-name").value = cardpack_edit["white"][id]["name"];

      render_info_card(cardpack_edit["white"][id]["name"], false);
  
      document.querySelector(`.card-entry.white[c-id="${id}"]`).classList.add("active");
    }

  }, 20);
}

function entry_hover(id, black) {

  if (document.activeElement.tagName != "INPUT") {
    // do
    if (black == true) {
      render_info_card(cardpack_edit["black"][id]["name"], true);
    } else {
      render_info_card(cardpack_edit["white"][id]["name"], false);
    }
  }
}


function edit_pack(pack_in, scroll=false) {

  cardpack_edit = {};
  cardpack_url = pack_in;

  edit_scroll_bottom = false;

  if (scroll == true) {
    edit_scroll = document.querySelector(".card-list").scrollTop;

    var scroll_max = document.querySelector(".card-list").clientHeight - document.querySelector(".card-list").scrollHeight;

    var scroll_bottom_tm = document.querySelector(".card-list").scrollHeight - document.querySelector(".card-list").clientHeight - document.querySelector(".card-list").scrollTop;

    if (scroll_bottom_tm <= 30) {
      edit_scroll_bottom = true;
    }

  } else {
    edit_scroll = 0;
  }

  var data_out = jcopy(manatee_settings);
  data_out["pack"] = pack_in;

  fetch('/get-cardpack', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(data_out)
  })
  .then(function (response) {
    return response.json();
  }).then(function (text) {
    console.log(text)

    if (text["white"] && text["black"]) {

      // yay cardpack now edit show tm

      cardpack_edit = jcopy(text);


      var cardlist_el = document.querySelector(".pack-editor .card-list");

      cardlist_el.innerHTML = "";
      document.querySelector(".info-pane input.card-name").value = "";
      document.querySelector(".info-pane input.cards-amt").value = "";

      // var header_back_cover = document.createElement("div");
      // header_back_cover.classList.add("header-back-cover");
      // cardlist_el.appendChild(header_back_cover);

      // black cards
      cardlist_el.appendChild(make_cardlist_header(true));

      for (car in cardpack_edit["black"]) {
        cardlist_el.appendChild(make_cardlist_entry(cardpack_edit["black"][car]["name"], car, true));
      }

      // white cards
      cardlist_el.appendChild(make_cardlist_header(false));

      for (car in cardpack_edit["white"]) {
        cardlist_el.appendChild(make_cardlist_entry(cardpack_edit["white"][car]["name"], car, false));
      }

      // scroll

      if (edit_scroll_bottom == true) {
        console.log("EID ITSCREOK ");
        document.querySelector(".card-list").scrollTop = document.querySelector(".card-list").clientHeight;;
      } else {
        document.querySelector(".card-list").scrollTop = edit_scroll;
      }

      if (reselect_card == true) {
        reselect_card = false;

        var is_black = false;
        if (selected_card["original"]["cards"]) {
          is_black = true;
        }

        entry_click(selected_card_id, is_black, true);
        document.activeElement.blur();
      }

      

      set_screen("packeditorpage");

      
    }

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });


}


function remove_card(id, black) {

  if ( confirm("are you sure you want to remove this carD????") == true) {
    var card_out;

    if (black == true) {
      card_out = cardpack_edit["black"][id];
    } else {
      card_out = cardpack_edit["white"][id];
    }
  
    card_removed["id"] = id;
    card_removed["black"] = black;
  
    var data_out = jcopy(manatee_settings);
  
    data_out["card"] = card_out;
    data_out["pack"] = cardpack_url;
  
    fetch('/remove-card', {
      method: "POST",
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(data_out)
    })
    .then(function (response) {
      return response.json();
    }).then(function (text) {
      console.log(text)
  
      if (text["removed"]) {
        if (text["removed"] == true) {
          edit_pack(cardpack_url, true);
        }
      }
  
        
    }).catch((error) => {
      console.error("[GET] API down!", error);
    });
  
  }
}

function add_card(black, data=false) {

  var data_out = jcopy(manatee_settings);
  
  data_out["black"] = black;
  data_out["pack"] = cardpack_url;
  data_out["data"] = data;

  fetch('/add-card', {
    method: "POST",
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify(data_out)
  })
  .then(function (response) {
    return response.json();
  }).then(function (text) {
    console.log(text)

    if (text["added"]) {
      if (text["added"] == true) {
        // alert("uay");
        edit_pack(cardpack_url, true);
      }
    }

      
  }).catch((error) => {
    console.error("[GET] API down!", error);
  });

}

function rapid_fire(black) {
  rf_black = false;
  rf_card = {};

  if (black == true) {
    rf_black = true;
    document.querySelector(".rf-cards-amt").disabled = false;
  } else {
    document.querySelector(".rf-cards-amt").disabled = true;
  }
  document.querySelector("input.rf-card-name").value = "";
  document.querySelector("input.rf-cards-amt").value = "";

  setTimeout( () => {
    document.querySelector("input.rf-card-name").focus();
  }, 20);
  
  render_info_card("", black);

  document.querySelector(".rapidfire").style.display = "";
}

function leave_rapid_fire() {
  document.querySelector(".rapidfire").style.display = "none";
  rf_card = {};
}

document.querySelector("input.rf-card-name").addEventListener("keydown", (e) => {

  if (e.which == 13) {
    // hitted entered
    rf_card["name"] = document.querySelector("input.rf-card-name").value;

    if (rf_black == true) {
      document.querySelector("input.rf-cards-amt").focus();
    } else {
      // white card
      // save
      add_card(false, rf_card);
      document.querySelector("input.rf-card-name").value = "";
      document.querySelector("input.rf-cards-amt").value = "";
    }
  } else if (e.which == 27) {
    // esc
    leave_rapid_fire();
  }
});
document.querySelector("input.rf-card-name").addEventListener("keyup", (e) => {
  render_info_card(document.querySelector("input.rf-card-name").value, rf_black);
});
document.querySelector("input.card-name").addEventListener("keyup", (e) => {
  var sel_black = false;
  if (selected_card["original"]["cards"]) {
    sel_black = true;
  }
  render_info_card(document.querySelector("input.card-name").value, sel_black);
});

document.querySelector("input.rf-cards-amt").addEventListener("keydown", (e) => {
  if (e.which == 13) {
    // hitted entered

    rf_card["name"] = document.querySelector("input.rf-card-name").value;
    var cards_amt = document.querySelector("input.rf-cards-amt").value;

    cards_amt = parseInt(cards_amt);
    if (cards_amt != NaN) {
      // NOT nan
      if (cards_amt > 0) {
        // yay
        console.log("cards_amt good!");
      } else {
        cards_amt = 1;
      }
    } else {
      cards_amt = 1;
    }
  
    rf_card["cards"] = cards_amt;
    
    add_card(true, rf_card);
    document.querySelector("input.rf-card-name").value = "";
    document.querySelector("input.rf-cards-amt").value = "";

    document.querySelector("input.rf-card-name").focus();
    
  } else if (e.which == 27) {
    // esc
    leave_rapid_fire();
  }
});


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
        get_out_tm = false;
        console.log("get out has been reversed. stay in!")

      if (game_stage == 2) {

      } else {
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
      }
      

    } else {  // NOT verified
      document.querySelector(".lobbypage .error-text").innerHTML = text["reason"];
      document.querySelector(".lobbypage .error-text").style.opacity = "1";
      setTimeout( () => {
        document.querySelector(".lobbypage .error-text").style.opacity = "";
      }, 2000)
    }


    fetch('/get-settings', {
      method: "POST",
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(manatee_settings)
    })
    .then(function (response) {
      return response.json();
    }).then(function (text) {
      set_settings_init(text);
      

    }).catch((error) => {
      console.error("[GET] API down!", error);
    });
      
      
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
  text_out = `${text_in}`.replaceAll("\\n", "<br>");
  text_out = text_out.replaceAll(/_{2,}/g, blank_space);
  text_out = text_out.replaceAll(blank_space, `<span style="display: inline-block">${blank_space}</span>`);

  text_out = text_out.replaceAll("_", `<span style="display: inline-block; transform: scale(1.1, 1);">_</span>`);
  // this makes every underscore just a little bit wider so they all become one big underscore

  try {
    text_out = twemoji.parse(text_out, { base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/' });
  } catch (err) {
    console.log("oops")
  }


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
      if(explosions == true) {
        var winner_crown = `${pl}`;
      }
      else {
        var winner_crown = ``;
      }
      var is_winner = false;

      if (round_data["winner"]) {
        if (pl == round_data["winner"] && explosions == true) {
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


      // twemoji.parse(pl_node);

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
          get_out_tm = true;
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
      // console.log(text)
      
      
      if (text["game running"] == true) {
        game_stage = 2; // GAME PLAY PLAY GAME
      }
      

      


    }).catch((error) => {
      console.error("[GET] API down!", error);
    });

  } else if (game_stage == 2 && get_out_tm == false) {


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
          cards_by_id_submitted = [];

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

          if (round_data["is manatee"] == true) {
            document.querySelector(".button.nextround").classList.add("show");
          }

          render_black_card();
          render_submissions(true);
          
        }


      }


      // live visual updates below
      if (round_stage == 0) {

        if (round_data["is manatee"] == true) {
          // player list ready list player



          if (typeof round_data["users ready"] == typeof []) {
            if (jstr(round_data["users ready"]) != jstr(prev_round_data["users ready"])) {
              
              document.querySelector(".choice-zone").innerHTML = "";

              for (p in round_data["players"]) {

                if (round_data["players"][p] != round_data["manatee"]) {
                  var pname_node = document.querySelector(".templates .playername").cloneNode(true);

                  pname_node.classList.remove("template");
                  pname_node.innerHTML = `${round_data["players"][p]}`;

                  if (round_data["users ready"].includes(round_data["players"][p])) {
                    pname_node.classList.add("green");
                  }

                  document.querySelector(".choice-zone").appendChild(pname_node);
                }                
              }
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
//TODO: make this work
/*function waitpage_update() {
  var post_data = JSON.parse(JSON.stringify(manatee_settings));
  fetch('/game-status', {
      method: "POST",
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(post_data)
    })
    .then(function (response) {
      return response.json();
    }).then(function (text) {
      // console.log(text)
      round_data = JSON.parse(JSON.stringify(text))

      //list of joined players
      if (jstr(round_data["players"]) != jstr(prev_round_data["players"])) {
        for (p in round_data["players"]) {
          var pname_node = document.querySelector(".templates .playername").cloneNode(true);

          pname_node.classList.remove("template");
          pname_node.innerHTML = `${round_data["players"][p]}`;
          if(is_host) {
            document.querySelector("host-player-list").appendChild(pname_node);
          } else {
            document.querySelector("nonhost-player-list").appendChild(pname_node);
          }
        }
      }

      prev_round_data = JSON.parse(JSON.stringify(round_data));
      if(round_data["game running"]) {
        clearInterval(waitpage_update);
      }
    }).catch((error) => {
      console.error("[GET] API down!", error);
    });
}

waitpage_update();
var lobby_tick_interval = setInterval(waitpage_update, 1000);*/

interval_function();
var game_tick_interval = setInterval( interval_function, 1000);


function save_game() {
  fetch('/save-game')
  .then(function (response) {

  }).catch((error) => {
    console.error("[GET] API down!", error);
  });
}