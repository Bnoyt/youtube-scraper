
from ..models import *
from django.shortcuts import render, get_object_or_404, redirect
import django

from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseRedirect,HttpResponse,JsonResponse
from django.core.urlresolvers import reverse

from django.template import loader
from django.db import connection as conection

import django.db as db
from networkit.graph import *
from networkit import overview
from networkit.centrality import *
 
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


def proc_calculUserfeatures(params):
	for name, info in django.db.connections.databases.items(): # Close the DB connections
		django.db.connection.close()

	channelId=params[0]
	userTab=params[1]
	userDic=params[2]
	date=params[3]
	pageRanks=params[4]
	weightedDegrees=params[5]
	q = params[6]
	

	for i in range(len(q)):
		u = q[i]
		gid = userDic[u.id]


		f = UserFeature(userId=u.userId,channelId=u.channelId,timeStamp=date)

		r = requests.get("https://www.googleapis.com/youtube/v3/channels?key="+ getGoogleKey() + "&part=snippet,id,topicDetails,contentDetails,statistics,status&id=" + str(u.userId)).json()
		try:
			items=r["items"]
		except KeyError:
			print(r)
		try:
			f.description=items[0]["snippet"]["description"]
			f.creationTime=items[0]["snippet"]["publishedAt"]
			stats = items[0]["statistics"]
			f.viewCount=stats["viewCount"]
			f.subscriberCount=stats["subscriberCount"]
			f.videoCount=stats["videoCount"]
			f.nbvideoscommentees=u.nbvideoscommentees
			f.nbLikes=u.nbLikes
			f.weightedDegree=weightedDegrees[i]
			#f.betweennessCentrality=userApproxBetweenness.score(gid)
			f.pageRank=pageRanks[i]
			f.save()

		except IndexError:	
			print(u.userId)

 

def calculUserFeatures(channelId,userGraph,userTab,userDic,date):
	#for name, info in django.db.connections.databases.items(): # Close the DB connections
	#	django.db.connection.close()


	print("Enregistrement de petites features utilisateur")

	with conection.cursor() as cursor:
		cursor.execute("""SELECT author_id,COUNT( DISTINCT "videoId"),SUM("likeCount") FROM dashboard_comment WHERE "channelId"='{}' GROUP BY author_id""".format(channelId))
		row = cursor.fetchall()
	for l in row:
		u = User.objects.get(pk=l[0]) 

		u.nbvideoscommentees = int(l[1])

		u.nbLikes = int(l[2])

		u.save()



	## Calcul des features graphe pour tout le monde

	print("Calcul du pageRank...") 

	userPageRank= PageRank(userGraph,damp=0.85,tol=0.00000001)

	userPageRank.run()

	#print("Calcul du betweennessCentrality...")

	#userApproxBetweenness = ApproxBetweenness(userGraph, epsilon=0.01, delta=0.1, universalConstant=1.0)

	#userApproxBetweenness.run()
 

	##  


	### Boucle sur tous les utilisateurs pour enregistrer les features


	print("Enregistrement des features utilisateur...")

	pool = mp.Pool(processes=NB_PROC_MAX)
	args = []
	pageRanks=[]
	weightedDegrees=[]
	q = User.objects.filter(channelId=channelId)
	for u in q:
		gid = userDic[u.id]

		pageRanks.append(userPageRank.score(gid))
		weightedDegrees.append(userGraph.weightedDegree(gid))

	N = len(q)
	for i in range(NB_PROC_MAX):
		args.append([channelId,userTab,userDic,date,pageRanks[i*N//NB_PROC_MAX:(i+1)*N//NB_PROC_MAX],weightedDegrees[i*N//NB_PROC_MAX:(i+1)*N//NB_PROC_MAX],q[i*N//NB_PROC_MAX:(i+1)*N//NB_PROC_MAX] ])
	pool.map(proc_calculUserfeatures,args)
	pool.close()
	pool.join() 	

	"""
 
	p = 0
	q = User.objects.filter(channelId=channelId)
	N = len(q)
	t0 = time()
	for u in q:
		p += 1
		gid = userDic[u.id]
		t1 = time()
		print(str(p)  + " / " + str(N) + " --- Temps restant : ~" + str((t1-t0)*(N-p)) +"s")
		t0=t1		

		f = UserFeature(userId=u.userId,channelId=u.channelId,timeStamp=date)

		r = requests.get("https://www.googleapis.com/youtube/v3/channels?key="+ getGoogleKey() + "&part=snippet,id,topicDetails,contentDetails,statistics,status&id=" + str(u.userId)).json()
		try:
			items=r["items"]
		except KeyError:
			print(r)
		try:
			f.description=items[0]["snippet"]["description"]
			f.creationTime=items[0]["snippet"]["publishedAt"]
			stats = items[0]["statistics"]
			f.viewCount=stats["viewCount"]
			f.subscriberCount=stats["subscriberCount"]
			f.videoCount=stats["videoCount"]
			f.nbvideoscommentees=u.nbvideoscommentees
			f.nbLikes=u.nbLikes
			f.weightedDegree=userGraph.weightedDegree(gid)
			#f.betweennessCentrality=userApproxBetweenness.score(gid)
			f.pageRank=userPageRank.score(gid)
			f.save()

		except IndexError:	
			print(u.userId)
		


	"""


 




def calculVideoFeatures(channelId,videoGraph,videoTab,videoDic,date):
	## Calcul des features graphe pour tout le monde

	print("Calcul du pageRank...") 

	graphPageRank= PageRank(videoGraph,damp=0.85,tol=0.00000001)

	graphPageRank.run()

	#print("Calcul du betweennessCentrality...")

	#userApproxBetweenness = ApproxBetweenness(userGraph, epsilon=0.01, delta=0.1, universalConstant=1.0)

	#userApproxBetweenness.run()
 

	## 


	### Boucle sur toutes les vidéos pour enregistrer les features
 
	for name, info in django.db.connections.databases.items(): # Close the DB connections
		django.db.connection.close()


	print("Enregistrement des features videos...")

	p = 0

	q = Video.objects.filter(channelId=channelId)
	#q = Video.objects.all()
	N = len(q)
	t0 = time()
	for v in q:
		p += 1
		gid = videoDic[v.videoId]
		t1 = time()
		print(str(p)  + " / " + str(N) + " --- Temps restant : ~" + str((t1-t0)*(N-p)) +"s")
		t0=t1		

		f = VideoFeature(videoId=v.videoId,channelId=v.channelId,timeStamp=date)
		f.viewCount=v.viewCount
		f.likeCount=v.likeCount
		f.dislikeCount=v.dislikeCount
		f.favoriteCount=v.favoriteCount
		f.pageRank=graphPageRank.score(gid)
		f.weightedDegree=videoGraph.weightedDegree(gid)
		f.commentCount=v.commentCount

		r = """SELECT SUM(nbvideoscommentees) FROM (SELECT distinct(dashboard_user.id),dashboard_user.nbvideoscommentees,dashboard_comment."videoId" from dashboard_user,dashboard_comment WHERE dashboard_user.id = dashboard_comment.author_id AND dashboard_comment."videoId"='{}') I;""".format(v.videoId)
		with conection.cursor() as cursor:
			cursor.execute(r)
			row = cursor.fetchall()

		if row[0][0] == None:
			f.usersPower= 0
		else:
			f.usersPower = row[0][0]


		f.save()
		






	return None




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