from ..models import *
from django.shortcuts import render, get_object_or_404, redirect

from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect,HttpResponse,JsonResponse
from django.core.urlresolvers import reverse

from django.template import loader
from django.db import connection as conection

from os import chdir

from bs4 import BeautifulSoup as bs

import isodate
import os
import requests
from time import time
import multiprocessing as mp
import json
import pandas as pd
import nltk


from .calculs import *

#os.chdir("Y:/My Documents/scraping/youtube")
API_Key = "AIzaSyB60BKUbJ5Lv43yx7ZvP6G1HFNtsH7MWwA"

"CsAk7wx2WgQ"
"UCH0XvUpYcxn4V0iZGnZXMnQ"


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))



 

def delete_all(request):
	Comment.objects.all().delete()
	User.objects.all().delete()
	UserLink.objects.all().delete()
	Video.objects.all().delete()
	Search.objects.all().delete()
	VideoDescHyperLink.objects.all().delete()
	CommentTextHyperLink.objects.all().delete()
	for c in Channel.objects.all():
		c.listening=False
		c.save()
	return HttpResponse("Tous les commentaires ont été supprimés")




def import_data(request):
	#channelId=request.GET["v"]
	#nprocs=request.GET["n"]
	#coms = all_comments_and_replies(channel_id=channelId)
	#vids=get_videos(channelId=channelId)
	#print("Tous les commentaires ont ete recuperes")
	#print("Début de la sauvegarde dans la BDD...")
	#save_coms(coms)

	updateChannel(channelId=request.GET["channelId"])

	return JsonResponse({"id":request.GET["channelId"]})



def index(request):
	context={}
	channels = Channel.objects.all().order_by("id")
	chaines=[]
	for i in channels:


		with conection.cursor() as cursor:
			cursor.execute("""SELECT COUNT(*) FROM dashboard_comment WHERE "channelId"='{}' """.format(i.channelId))
			row = cursor.fetchall()
		nbcomments= row[0][0]
		with conection.cursor() as cursor:
			cursor.execute("""SELECT COUNT(*) FROM dashboard_userfeature WHERE "channelId"='{}' AND "timeStamp"='{}' """.format(i.channelId,i.listeningTime))
			row = cursor.fetchall()
		nbliens= row[0][0]
		with conection.cursor() as cursor:
			cursor.execute("""SELECT COUNT(*)FROM dashboard_video WHERE "channelId"='{}' """.format(i.channelId))
			row = cursor.fetchall()
		nbvideos= row[0][0]




		#print(len(list(Comment.objects.filter(channelId=i.channelId))))
		chaines.append({
			'nbcomments':nbcomments,
			'nbvideos':nbvideos,
			'nbliens':nbliens,
		"channel":i})
	context["chaines"]=chaines
	context["channels"] = channels

	return render(request,"dashboard.html",context)





def videosCommentees(request):


	calculVideosCommentees(channelId=request.GET["channelId"])

	return HttpResponse("tranquille")


def liens(request):
	calculLiens(channelid=request.GET['channelId'])

	return HttpResponse("C'est bon")


def autoconfig(request):
	nltk.download('wordnet')
	GoogleKey.objects.all().delete()
	with open(os.path.join(BASE_DIR, "google_keys.txt"),"r") as file:
		lignes=file.read().split("\n")
		for l in lignes:
			g = GoogleKey(value=l)
			g.save()

	return HttpResponseRedirect(reverse("index"))


def export(request):
	data=request.GET["data"]
	channelId=request.GET["id"]

	if data == "users":
		with conection.cursor() as cursor:
			cursor.execute("""SELECT * FROM dashboard_userfeature WHERE "channelId"='{}' """.format(i.channelId))
			row = cursor.fetchall()

			# Create the HttpResponse object with the appropriate CSV header.
		response = HttpResponse(content_type='text/csv')
		response['Content-Disposition'] = 'attachment; filename="somefilename.csv"'

		writer = csv.writer(response)
		writer.writerow(['First row', 'Foo', 'Bar', 'Baz'])


	if data == "videos":
		with conection.cursor() as cursor:
			cursor.execute("""SELECT * FROM dashboard_videofeature WHERE "channelId"='{}' """.format(i.channelId))
			row = cursor.fetchall()


def search(request):

	recherches = Search.objects.all()
	context={"searchs":[]}
	for r in recherches:
		with conection.cursor() as cursor:
			cursor.execute("""SELECT count(*) FROM dashboard_relationvideosearch WHERE "search_id"='{}' """.format(r.id))
			row = cursor.fetchall()
		nbvideosvues = row[0][0]
		with conection.cursor() as cursor:
			cursor.execute("""SELECT count(*) FROM dashboard_relationchannelsearch WHERE "search_id"='{}' """.format(r.id))
			row = cursor.fetchall()
		nbchaineschoisies = row[0][0]
		context["searchs"].append({"search":r,"nbvideosvues":nbvideosvues,"nbchaineschoisies":nbchaineschoisies})

		
	return render(request,"search.html",context)

def ajout_search(request):
	print(request.POST["date"])
	startSearch(request.POST["keywords"],request.POST["nbvideos"],request.POST["date"])

	return HttpResponse("salut") 


def save_search(request):
	saveSearch(request.GET["id"])

	return HttpResponse("c'est bon")

def export_neo4j(request):
	a = importNeo4J(request.GET["id"])
	return HttpResponseRedirect("http://localhost:7474/browser")


def detect_topics(request):
	search_id = request.GET['id']
	search = get_object_or_404(Search,pk=search_id)
	print("Récupération des textes...")
	with conection.cursor() as cursor:
		cursor.execute("""SELECT dashboard_video."videoId",dashboard_video.description FROM dashboard_video JOIN dashboard_relationvideosearch ON dashboard_video."videoId"=dashboard_relationvideosearch."videoId" WHERE dashboard_relationvideosearch.search_id='{}' """.format(search_id))
		row = cursor.fetchall()
	args=pd.DataFrame(row)
	args.columns=["videoId","description"]
	print("Récupération des topics...")
	topics = LDA_topicExtraction(args["description"])
	topics = [format_topic(i) for i in topics]
	context = { "search":search,
				"topics":topics }
	return render(request,"topics.html",context)

def detect_videotopics(request):
	video_id = request.GET['id']
	a = lookForVideo(video_id)

	video = Video.objects.filter(videoId=video_id)[0]

	print("Récupération des textes...")
	with conection.cursor() as cursor:
		cursor.execute("""SELECT "commentId","textDisplay" FROM dashboard_comment  WHERE "videoId"='{}' """.format(video_id))
		row = cursor.fetchall()
	args=pd.DataFrame(row)
	args.columns=["commentId","textDisplay"]
	print("Récupération des topics...")
	a = LDA_topicExtraction(args["textDisplay"])
	topics = [format_topic(i) for i in a]



	context = { "video":video,
				"topics":topics }
	return render(request,"videotopics.html",context)

def videosearch(request):
	return render(request,"videosearch.html")


def etat_recherche(request):
	with conection.cursor() as cursor:
		cursor.execute("""SELECT search_id,COUNT("videoId") FROM dashboard_relationvideosearch
						GROUP BY search_id
						ORDER BY search_id ASC""")
		row = cursor.fetchall()
	total = {}
	for i in row:
		total[i[0]] = i[1]

	with conection.cursor() as cursor:
		cursor.execute("""SELECT dashboard_relationvideosearch.search_id,COUNT(*) FROM dashboard_video
						INNER JOIN dashboard_relationvideosearch ON dashboard_relationvideosearch."videoId" = dashboard_video."videoId"
						GROUP BY dashboard_relationvideosearch.search_id
						ORDER BY dashboard_relationvideosearch.search_id ASC""")
		row = cursor.fetchall()
	result = []
	for i in row:
		result.append(int(100* i[1] / total[i[0]]))

	return JsonResponse({"result":result})

def delete_search(request):
	iid = request.GET["id"]
	search = get_object_or_404(Search,pk=int(iid))
	search.delete()
	return HttpResponseRedirect(reverse("search"))
