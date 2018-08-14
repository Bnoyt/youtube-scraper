
from ..models import *
from django.shortcuts import render, get_object_or_404, redirect
import django

from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect,HttpResponse,JsonResponse
from django.core.urlresolvers import reverse

from django.template import loader
from django.db import connection as conection

import django.db as db
#from networkit.graph import *
#from networkit import overview
#from networkit.centrality import *
 
from os import chdir

from bs4 import BeautifulSoup as bs
import datetime
import isodate
import os
import requests
from time import time
import multiprocessing as mp
import json
import pandas as pd

NB_PROC_MAX = 60

def getGoogleKey():
	return GoogleKey.objects.all().order_by('?')[0].value




def userLinks(channelId):
	UserLink.objects.filter(channelId=channelId).delete()
	cursor = conection.cursor()
	r = """ SELECT t1.author_id,t2.author_id,COUNT(t1."videoId") FROM dashboard_comment as t1,dashboard_comment as t2 WHERE t1.id > t2.id AND t1."videoId" = t2."videoId" AND t1."channelId"='{}' GROUP BY t1.author_id,t2.author_id HAVING COUNT(t1."videoId") > 0; """.format(channelId)
	cursor.execute(r)
	row=cursor.fetchall()
	for i in row:
		#print(i)
		uid1 = User.objects.get(pk=int(i[0])).userId
		uid2 = User.objects.get(pk=int(i[1])).userId
		count = i[2]

		rel = UserLink(source=uid1,target=uid2,weight=int(count),channelId=channelId)
		rel.save()

	return True

def videoLinks(channelId):
	VideoLink.objects.filter(channelId=channelId).delete()
	cursor = conection.cursor()
	r = """ SELECT t1."videoId",t2."videoId",COUNT(DISTINCT t1.author_id) FROM dashboard_comment as t1,dashboard_comment as t2 WHERE t1.id > t2.id AND t1.author_id = t2.author_id AND t1."channelId"='{}' GROUP BY t1."videoId",t2."videoId" HAVING COUNT(t1.author_id) > 0; """.format(channelId)
	cursor.execute(r)
	row=cursor.fetchall()
	for i in row:
		vid1 = i[0]
		vid2 = i[1]
		count = i[2]

		rel = VideoLink(source=vid1,target=vid2,weight=int(count),channelId=channelId)
		rel.save()

	return True

def channelLinks():
	ChannelLink.objects.all().delete()
	c = ChannelToListen.objects.all()
	for i in range(len(c)):
		for j in range(i+1,len(c)):
			print(str(i) + " --- " + str(j))
			cursor = conection.cursor()
			r = """ SELECT COUNT(DISTINCT "userId") FROM (SELECT "userId" FROM dashboard_user WHERE "channelId"='{}' INTERSECT SELECT "userId" from dashboard_user WHERE "channelId"='{}') I; """.format(c[i].channelId,c[j].channelId)
			cursor.execute(r)
			row=cursor.fetchall()
			vid1 = c[i].channelId
			vid2 = c[j].channelId
			count = row[0][0]
			if count > 0:
				rel = ChannelLink(source=vid1,target=vid2,weight=int(count))
				rel.save()

	return True
 



def createVideoGraph(channelId):
	for name, info in django.db.connections.databases.items(): # Close the DB connections
		django.db.connection.close()
	a = Video.objects.filter(channelId=channelId).values("videoId")
	#a = Video.objects.all().values("videoId")
	#print(a[:10])
	videoTab = [i["videoId"] for i in a]
	videoDic = {}
	for i in range(len(videoTab)):
		videoDic[videoTab[i]] = i

	print("début du calcul du videoGraph")

	cursor = conection.cursor()
	r = """ SELECT t1."videoId",t2."videoId",COUNT(DISTINCT t1.author_id) FROM dashboard_comment as t1,dashboard_comment as t2 WHERE t1.id > t2.id AND t1.author_id = t2.author_id AND t1."channelId"='{}' AND t2."channelId"='{}' GROUP BY t1."videoId",t2."videoId" HAVING COUNT(t1.author_id) > 0; """.format(channelId,channelId)
	cursor.execute(r)
	row=cursor.fetchall()

	#r = """ SELECT t1."videoId",t2."videoId",COUNT(DISTINCT t1.author_id) FROM dashboard_comment as t1,dashboard_comment as t2 WHERE t1.id > t2.id AND t1.author_id = t2.author_id GROUP BY t1."videoId",t2."videoId" HAVING COUNT(t1.author_id) > 0; """
	#cursor.execute(r)
	#row=cursor.fetchall()

	print("premiere etape faite")

	videoGraph = Graph(n=len(videoTab),weighted=True,directed=False)
	for i in row:
		try:
			videoGraph.addEdge(videoDic[i[0]],videoDic[i[1]],i[2])
		except KeyError:
			print("erreur")

	print("fin du calcul du videoGraph")
  
	overview(videoGraph) 
 
	return videoGraph,videoTab,videoDic

 
def createUserGraph(channelId):
	for name, info in django.db.connections.databases.items(): # Close the DB connections
		django.db.connection.close()


	a = Comment.objects.filter(channelId=channelId).values("author_id")
	#a = Comment.objects.all().values("author_id")
 

	#cursor = conection.cursor()
	#r = """ SELECT DISTINCT author_id FROM dashboard_comment WHERE "channelId"='{}' """.format(channelId)
	#cursor.execute(r)
	#row=cursor.fetchall()

	userTab = [i["author_id"] for i in a]
	userDic = {}
	for i in range(len(userTab)):
		userDic[userTab[i]] = i

	print("début du calcul du usergraph")

	cursor = conection.cursor()

	r = """ SELECT t1.author_id,t2.author_id,COUNT(t1."videoId") FROM dashboard_comment as t1,dashboard_comment as t2 WHERE t1.id > t2.id AND t1."videoId" = t2."videoId" AND t1."channelId"='{}' AND t2."channelId"='{}' GROUP BY t1.author_id,t2.author_id HAVING COUNT(t1."videoId") > 0; """.format(channelId,channelId)
	cursor.execute(r)
	row=cursor.fetchall()
	#r = """ SELECT t1.author_id,t2.author_id,COUNT(t1."videoId") FROM dashboard_comment as t1,dashboard_comment as t2 WHERE t1.id > t2.id AND t1."videoId" = t2."videoId" GROUP BY t1.author_id,t2.author_id HAVING COUNT(t1."videoId") > 0; """
	#cursor.execute(r)
	#row=cursor.fetchall()

	print("premiere etape faite")

	userGraph = Graph(n=len(userTab),weighted=True,directed=False)
	for i in row:

		try:
			userGraph.addEdge(userDic[i[0]],userDic[i[1]],i[2])
		except KeyError:
			print("erreur")

	print("fin du calcul du usergraph")

	overview(userGraph)

	return userGraph,userTab,userDic