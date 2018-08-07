
from ..models import *
from django.shortcuts import render, get_object_or_404, redirect
import django

from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect,HttpResponse,JsonResponse
from django.core.urlresolvers import reverse

from django.template import loader
from django.db import connection as conection

import django.db as db
 
from os import chdir

from bs4 import BeautifulSoup as bs

import isodate
import os
import requests
from time import time
from time import sleep
import multiprocessing as mp
import json
import pandas as pd
import datetime



BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


