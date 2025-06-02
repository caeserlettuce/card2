from flask import Flask, Response, send_from_directory, request, redirect, jsonify
from datetime import datetime
import time
import os, sys
import json
import atexit
import math
import random
import logging
import copy
now = datetime.now()


game_data = {
    "game running": False,
    "game segment": "lobby",
    "round stage": 0,
    "room code": False,
    "players": [],
    "host": False,
    "cards": {
        "black": [],
        "white": [],
        "av_white": []
    },
    "black card index": 10000,
    "white card index": 10000,
    "submitted": {},
    "points": [],
    "users ready": [],
    "manatee": False,
    "black card": {},
    "white cards": {},
    "settings": {
        "rotating": True,
        "hand size": 7,
        "random hand": False
    }
}

cardname_index = 1

# game_data["players"] = [
#     "jesse",
#     "simon",
#     "eamon",
#     "sam",
#     "gavin"
# ]

# game_data["white cards"] = {"jesse": [{"name": "eamon"}]}

class bc:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def exit_handler():
    print(bc.CYAN + "\gvgk." + bc.END)



print(bc.HEADER + "to host on the local network, run 'flask run --host=0.0.0.0'" + bc.END)
atexit.register(exit_handler)
app = Flask(__name__)
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

def save_game():
    now = datetime.now()
    datestr = now.strftime("%d-%m-%Y_%H-%M-%S")
    crashfile = open("game_logs/crash_" + datestr + ".json", "a")
    crashfile.write(json.dumps(game_data))
    crashfile.close()

if os.path.isfile("packs.json") == False:
    packs_file = open("packs.json", 'x')
    packs_file.write(json.dumps({"enabled packs": []}))
    packs_file.close()


def check_card_name(pack, name, black):
    global cardname_index
    url = "cards/" + pack

    if os.path.isfile(url):
        pack_file = open(url, 'r')
        pack_json = copy.deepcopy(json.load(pack_file))
        pack_file.close()

        type_tm = "white"
        if black == True:
            type_tm = "black"

        check_list = []

        for c in pack_json[type_tm]:
            check_list.append(c["name"])
        check_list.sort()
        for n in check_list:
            if name == n:
                name = name + " " + str(cardname_index)
                cardname_index += 1
        
        for n in check_list:
            if name == n:
                name = name + " " + str(int(round(time.time() * 1000)))  # that outta do it
                cardname_index += 1
                
        return name
    else:
        return str(int(round(time.time() * 1000)))





def generate_card_listing():

    # write this morer later
    out = {
        "black": [],
        "white": [],
        "av_white": []
    }

    packs_file = open('packs.json', 'r')
    packs_json = copy.deepcopy(json.load(packs_file))
    packs_file.close()

    for p in packs_json["enabled packs"]:

        p_url = "cards/" + p

        if os.path.isfile(p_url):

            p_file = open(p_url, 'r')
            p_json = copy.deepcopy(json.load(p_file))
            p_file.close()

            out["black"].extend(p_json["black"])
            out["white"].extend(p_json["white"])

    return out

def random_black_card():

    game_data["black card index"] += 1

    if game_data["black card index"] > len(game_data["cards"]["black"]) - 1:    # RESET black card deck!
        print("black card index is TOO HIGH NOW!!! RESETTING!!")
        random.shuffle(game_data["cards"]["black"]) # SHUFFLE black cards
        game_data["black card index"] = 0

    out = game_data["cards"]["black"][game_data["black card index"]] # set black card

    return out

def random_white_card():

    game_data["white card index"] += 1

    if game_data["white card index"] > len(game_data["cards"]["av_white"]) - 1:    # RESET white card deck!
        print("white card index is TOO HIGH NOW!!! RESETTING!!")

        unavailable_cards = []
        for p in game_data["white cards"]:
            for c in game_data["white cards"][p]:
                unavailable_cards.append(c)
        # this makes a list of all the cards still in people's hands
        
        white_cards_tm = copy.deepcopy(game_data["cards"]["white"])

        for c in unavailable_cards:
            white_cards_tm.remove(c)
        # now i have a list of all the cards that are not in people's hands
        game_data["cards"]["av_white"] = copy.deepcopy(white_cards_tm)

        random.shuffle(game_data["cards"]["av_white"])
    
        game_data["white card index"] = 0
    #now that the stuff and things are good
        
    out = game_data["cards"]["av_white"][game_data["white card index"]] # set white card

    return out


def refill_white_cards():


    if game_data["settings"]["random hand"] == True:    # random hands

        cards_choose = copy.deepcopy(game_data["cards"]["white"])
        random.shuffle(cards_choose)

        for player in game_data["players"]:

            game_data["white cards"][player] = []   # clear current hand / make hand if it doesnt exist already

            for i in range(game_data["settings"]["hand size"]):
                game_data["white cards"][player].append(cards_choose[0])
                cards_choose.pop(0)

    else:   # normal hands

        for player in game_data["players"]:
            # print(player)

            if player not in game_data["white cards"]:  # if player does not have a hand yet, make one
                game_data["white cards"][player] = []

            hand_len = len(game_data["white cards"][player])
            cards_to_fill = game_data["settings"]["hand size"] - hand_len

            if cards_to_fill > 0:
                # hand is smaller than hand size!
                for i in range(cards_to_fill):
                    game_data["white cards"][player].append(random_white_card()) #new card

            



def start_new_round():

    print("STARTING NEW ROUND")

    for pl in game_data["submitted"]:
        cards = game_data["submitted"][pl]
        for cr in cards:
            game_data["white cards"][pl].remove(cr)

    game_data["round stage"] = 0
    game_data["submitted"] = {}
    game_data["users ready"] = []


    round_number = len(game_data["points"])

    # choose manatee
    if round_number == 0: # first round
        game_data["manatee"] = game_data["host"]
    else:
        # not first round

        if game_data["settings"]["rotating"] == True:

            manatee_index = game_data["players"].index(game_data["manatee"])

            if manatee_index + 1 > len(game_data["players"]) - 1:
                game_data["manatee"] = game_data["players"][0]
            else:
                game_data["manatee"] = game_data["players"][manatee_index + 1]
        else:
            print("NOT rotating!!")

            # the last winner is now the manatee

            print(game_data["points"])

            game_data["manatee"] = game_data["points"][-1]["player"]

    print(game_data["manatee"])

    # black card choice
    game_data["black card"] = random_black_card()

    #white card choice
    refill_white_cards()

# at the beginning of each round, these things must be done:

# [x] cards json must be generated (on game start)

# [ ] manatee must be chosen (for the first round, it's the host). for other rounds, it's either whoever won last, or rotating (that'll be a game option)

# [x] black card must be randomly chosen

# [x] white cards for everyone must be randomly chosen

# i think thats it



def root_dir():  # pragma: no cover
    return os.path.abspath(os.path.dirname(__file__))

def get_file(filename):
    try:
        src = os.path.join(root_dir(), filename)
        return open(src).read()
    except IOError as exc:
        return str(exc)

@app.route('/assets/<path:path>')
def send_report(path):
    return send_from_directory('assets', path)

@app.route('/cards2.js')
def send_cards2():
    return Response(get_file('cards2.js'))

@app.route("/", methods=['GET', 'POST'])
def route_main():
    return Response(get_file('cards2.html'))


@app.route("/loading-status", methods=['GET', 'POST'])
def route_loading_status():
    #POST request
    # if (request.method == 'POST'):
    
    request_json = request.get_json()
    
    get_out = False

    if game_data["game running"] == True:
        if "username" in request_json and "room code" in request_json:
            if request_json["username"] in game_data["players"] and request_json["room code"] == game_data["room code"]:
                # is a real player
                get_out = False
            else:
                get_out = True
        else:
            get_out = True
    else:
        get_out = True

    st = {
        "lobby": False,
        "game running": False,
        "get out": get_out
    }

    # if get_out == True:
        # print("get OUT")

    if game_data["game running"] == False:
        
        if game_data["game segment"] == "lobby":    # waiting for players
            st["lobby"] = True
        else:
            st["lobby"] = False
    
    elif game_data["game running"] == True:
        st["game running"] = True

    return st
    # return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it


@app.route("/join-game", methods=['GET', 'POST'])
def route_join_game():
    #POST request

    print("WHAy")

    st = {}

    player_settings = request.get_json()

    print(player_settings)

    if player_settings["username"] in game_data["players"] or game_data["game running"] == False:
        # if a player is re-joining, or joining the game for the first time

        if game_data["room code"] == False or game_data["host"] == False:
            # NO host OR room code which means you are the host
            st["is host"] = True
            st["verified"] = True
            game_data["room code"] = player_settings["room code"]
            game_data["host"] = player_settings["username"]
            if player_settings["username"] not in game_data["players"]:
                game_data["players"].append(player_settings["username"])
        else:
            # in lobbeh

            if player_settings["username"] == game_data["host"]:
                st["is host"] = True

            if player_settings["room code"] == game_data["room code"]:
                st["verified"] = True
                if player_settings["username"] not in game_data["players"]:
                    game_data["players"].append(player_settings["username"])
            else:
                st["verified"] = False
                st["reason"] = "invalid room code"

    else:
        st["verified"] = False
        st["reason"] = "game already running"


    return st
    # return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it




@app.route("/start-game", methods=['GET', 'POST'])
def route_startgame():

    # START GAME!!!

    game_data["cards"] = generate_card_listing()

    game_data["game running"] = True
    game_data["game segment"] = "game"

    game_data["players"] = list(set(game_data["players"]))

    start_new_round()

    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it

@app.route("/next-round", methods=['GET', 'POST'])
def route_next_round():

    # START GAME!!!

    start_new_round()

    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it




@app.route("/game-status", methods=['GET', 'POST'])
def route_game_status():
    #POST request

    st = {}

    player_settings = request.get_json()

    # print(player_settings)

    if player_settings["username"] in game_data["players"] and player_settings["room code"] == game_data["room code"]:
        # if a player is re-joining, or joining the game for the first time
        # print("MATCH!")

        player_uname = player_settings["username"]

        st["round stage"] = game_data["round stage"]    # provide round stage
        st["black card"] = game_data["black card"]      # provide black card
        st["manatee"] = game_data["manatee"]            # provide manatee name
        st["submitted"] = game_data["submitted"]        # provide submitted cards
        st["users ready"] = game_data["users ready"]    # provude ready users
        st["players"] = game_data["players"]            # provide players
        st["points"] = game_data["points"]              # provide points

        if len(game_data["points"]) > 0:                # provide winner
            st["winner"] = game_data["points"][-1]["player"]
        else:
            st["winner"] = False
        
        st["cards"] = copy.deepcopy(game_data["white cards"][player_uname])     # provide user's hand

        # is manatee ???
        if game_data["manatee"] == player_uname:
            st["is manatee"] = True     # (i can technically do this client side but where's the fun in that)
        else:
            st["is manatee"] = False
        
        # server-side stuff
        
        if player_uname not in game_data["submitted"]:
            game_data["submitted"][player_uname] = []
            
        if game_data["round stage"] == 0:
            if game_data["submitted"][player_uname] != player_settings["submitted"]:
                game_data["submitted"][player_uname] = player_settings["submitted"]

        # this should keep the server-side up to date with cards even if the user does not submit them
        
        # the "submit cards" button only actually tells the server and the manatee that the user is ready
            
        






    return st
    # return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it

@app.route("/submit-cards", methods=['GET', 'POST'])
def route_submit_cards():
    #POST request
    request_json = request.get_json()

    pl_value = request_json["value"]
    pl_uname = request_json["mnt_stg"]["username"]
    pl_rmcod = request_json["mnt_stg"]["room code"]

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:
        # yay!

        if pl_value > 0:
            # submitting
            if pl_uname not in game_data["users ready"]:
                game_data["users ready"].append(pl_uname)
                print("user " + pl_uname + " has submitted their cards!")
        if pl_value < 0:
            # unsubmitting
            if pl_uname in game_data["users ready"]:
                game_data["users ready"].remove(pl_uname)
                print("user " + pl_uname + " has unsubmitted their cards!")

    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it

@app.route("/end-round", methods=['GET', 'POST'])
def route_endround():
    
    # END the round

    game_data["round stage"] = 1


    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it

@app.route("/vote-card", methods=['GET', 'POST'])
def route_votecard():
    
    # VOTE the card

    request_json = request.get_json()

    pl_vote = request_json["vote"]
    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"] and pl_uname == game_data["manatee"]:

        # vote it up

        point_json = {
            "player": pl_vote,
            "black card": game_data["black card"],
            "cards": game_data["submitted"][pl_vote]
        }

        game_data["points"].append(point_json)

        game_data["round stage"] = 2


    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it


@app.route("/set-setting", methods=['GET', 'POST'])
def route_set_setting():
    
    # SET the setting

    request_json = request.get_json()

    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]
    pl_setting = request_json["setting"]
    pl_value = request_json["value"]

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:

        game_data["settings"][pl_setting] = pl_value

    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it

@app.route("/get-settings", methods=['GET', 'POST'])
def route_get_settings():
    
    # GET the setting

    request_json = request.get_json()

    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:

        return game_data["settings"]
    
    else:
        return {}

@app.route("/get-cardpacks", methods=['GET', 'POST'])
def route_get_cardpacks():
    
    # GET the card packs

    request_json = request.get_json()
    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:

        out = {
            "packs": [],
            "enabled": []
        }
        
        for f in os.listdir("cards"):
            if ".json" in f:
                out["packs"].append(f)

        packs_read = open('packs.json')
        packs_json = json.load(packs_read)
        out["enabled"] = copy.deepcopy(packs_json["enabled packs"])
        packs_read.close()

        return out
    else:
        return {}
    
@app.route("/get-cardpack", methods=['GET', 'POST'])
def route_get_cardpack():
    
    # GET the card pack

    request_json = request.get_json()
    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]
    pl_pack = request_json["pack"]

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:

        out = {}

        url = "cards/" + pl_pack

        if os.path.isfile(url):

            cards_read = open(url)
            cards_json = json.load(cards_read)
            out = copy.deepcopy(cards_json)
            cards_read.close()

        return out
    else:
        return {}

@app.route("/toggle-cardpack", methods=['GET', 'POST'])
def route_toggle_cardpack():
    
    # TOGGLE the card pack

    request_json = request.get_json()
    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]
    pl_pack = request_json["pack"]
    pl_bool = request_json["bool"]

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:

        packs_file = open('packs.json', 'r')
        packs_json = copy.deepcopy(json.load(packs_file))
        packs_file.close()
        packs_file = open('packs.json', 'w')
        
        if pl_bool == True:
            if pl_pack not in packs_json["enabled packs"]:
                packs_json["enabled packs"].append(pl_pack) # add
        elif pl_bool == False:
            if pl_pack in packs_json["enabled packs"]:
                packs_json["enabled packs"].remove(pl_pack) # remove
        
        packs_file.write(json.dumps(packs_json))

    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it

@app.route("/edit-card", methods=['GET', 'POST'])
def route_edit_card():
    
    # EDIT the card

    request_json = request.get_json()
    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]
    pl_change = request_json["change"]
    pl_pack = request_json["pack"]
    
    out = {
        "edited": False
    }

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:
        
        url = "cards/" + pl_pack

        if os.path.isfile(url):

            pack_file = open(url, 'r')
            pack_json = copy.deepcopy(json.load(pack_file))
            pack_file.close()

            succeeded = False
            is_black = False

            if "cards" in pl_change["original"]:
                is_black = True

            if pl_change["original"]["name"] != pl_change["new"]["name"]:   # if the name is being changed from what it used to be
                pl_change["new"]["name"] = check_card_name(pl_pack, pl_change["new"]["name"], is_black)

            if is_black == True:
                try:
                    card_index = pack_json["black"].index(pl_change["original"])
                    pack_json["black"][card_index] = pl_change["new"]
                    succeeded = True
                except Exception:
                    print("oops")

            else:
                try:
                    card_index = pack_json["white"].index(pl_change["original"])
                    pack_json["white"][card_index] = pl_change["new"]
                    succeeded = True
                except Exception:
                    print("oops")
            

            if succeeded == True:
                pack_file = open(url, 'w')
                pack_file.write(json.dumps(pack_json))
                pack_file.close()

                out["edited"] = True

    return out

        

@app.route("/add-card", methods=['GET', 'POST'])
def route_add_card():
    
    # ADD the card

    request_json = request.get_json()
    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]
    pl_black = request_json["black"]
    pl_pack = request_json["pack"]
    pl_data = request_json["data"]

    out = {
        "added": False
    }

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:

        url = "cards/" + pl_pack

        if os.path.isfile(url):

            pack_file = open(url, 'r')
            pack_json = copy.deepcopy(json.load(pack_file))
            pack_file.close()

            new_card = {
                "name": "new card"
            }

            if pl_data != False:
                new_card["name"] = pl_data["name"]

            new_card["name"] = check_card_name(pl_pack, new_card["name"], pl_black)


            if pl_black == True:
                
                if pl_data == False:
                    new_card["cards"] = 1
                else:
                    new_card["cards"] = pl_data["cards"]

                pack_json["black"].append(new_card)
            else:
                pack_json["white"].append(new_card)

            pack_file = open(url, 'w')
            pack_file.write(json.dumps(pack_json))
            pack_file.close()

            out["added"] = True
            out["card"] = new_card

    return out

@app.route("/remove-card", methods=['GET', 'POST'])
def route_remove_card():
    
    # REMOVE the card

    request_json = request.get_json()
    pl_uname = request_json["username"]
    pl_rmcod = request_json["room code"]
    pl_card = request_json["card"]
    pl_pack = request_json["pack"]

    out = {
        "removed": False
    }

    if pl_uname in game_data["players"] and pl_rmcod == game_data["room code"]:

        url = "cards/" + pl_pack

        if os.path.isfile(url):
            pack_file = open(url, 'r')
            pack_json = copy.deepcopy(json.load(pack_file))
            pack_file.close()

            if "cards" in pl_card:
                pack_json["black"].remove(pl_card)
            else:
                pack_json["white"].remove(pl_card)

            pack_file = open(url, 'w')
            pack_file.write(json.dumps(pack_json))
            pack_file.close()

            out["removed"] = True

    return out


@app.route("/save-game", methods=['GET', 'POST'])
def route_savegame():
    save_game()
    return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it




# what needs to happen within the round:

# round start (round stage 0)

#     {
# [ ]   manatee has screen that shows the black card, and a list of all the playes that have chosen their cards
# [ ]   players have a screen with the black card and their deck, and they get to choose their card(s). and then theres a button to lock in the choice
#     }

# manatee ends the round (round stage 1)

#     {
# [ ]   both manatee and players have a screen with the black card, and all of the players' choices.
# [ ]   manatee has the ability to click on one to choose that as the winner of the round
#     }

# manatee chooses the winner (round stage 2)


#     {
# [ ]   all other cards fade out and the winning ones remain. screen says {player name} wins!
# [ ]   the winner then has a button that says "start new round" which will, of course, start a new round.
#     }






