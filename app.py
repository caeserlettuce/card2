from flask import Flask, Response, send_from_directory, request, redirect, jsonify
from datetime import datetime
import os, sys
import json
import atexit
import math
import random
import logging
now = datetime.now()


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


@app.route("/loading-status", methods=['GET'])
def get_played_cards():
    #POST request
    # if (request.method == 'POST'):
        # played_cards = request.get_json()
    
    st = {"yay": True}

    return st
    # return "michael jackson: hee hee" # i cannot believe it will actually return this and accept it
