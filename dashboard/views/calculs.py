
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

from .features import *
from .nlp import *
from neo4jrestclient.client import GraphDatabase

NB_PROC_MAX = 60

django.setup() # Must call setup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def getGoogleKey():
	return GoogleKey.objects.all().order_by('?')[0].value
	#if len(a) == 0:
	#	return getGoogleKey()
	#else:
		#print(len(a))
	#	return a[0].value

 
def to_xml(df, filename=None, mode='wb'):
    def row_to_xml(row):
        xml = ['<item>']
        for i, col_name in enumerate(row.index):
            xml.append('  <field name="{0}">{1}</field>'.format(col_name, row.iloc[i]))
        xml.append('</item>')
        return '\n'.join(xml)
    res = '\n'.join(df.apply(row_to_xml, axis=1)).encode("utf-8")

    if filename is None:
        return res
    with open(filename, mode) as f:
        f.write(res)


def comments(video_id=None,token=None,parent_id=None,channel_id=None):
	debut = "https://www.googleapis.com/youtube/v3/commentThreads?key="
	if token==None:
		token=""
	else:
		token = "&pageToken=" + token

	
	
	if video_id == None:
		video_id = ""
	else:
		video_id = "&videoId=" + video_id		
		
	if parent_id==None:
		parent_id=""
	else:
		debut = "https://www.googleapis.com/youtube/v3/comments?key="
		parent_id = "&parentId=" + parent_id	

	if channel_id==None:
		channel_id=""
	else:
		channel_id = "&allThreadsRelatedToChannelId=" + channel_id	

	#print(debut + getGoogleKey() + "&textFormat=plainText&maxResults=100&part=snippet,id" + channel_id + video_id + token + parent_id)		

	r = requests.get(debut + getGoogleKey() + "&textFormat=plainText&maxResults=100&part=snippet,id" + channel_id + video_id + token + parent_id).json()
	return r

def aplatir(dic):
	A = []
	for d in dic:
		for k in d:
			A.append(k)
	return A
 
"""
def all_comments(video_id=None,parent_id=None,channel_id=None):
	r = comments(video_id=video_id,parent_id=parent_id,channel_id=channel_id)
	#print(r)
	T = [r["items"]]
	save_coms(clean_coms(T[-1]))
	t = 0
	while t < 100:
		try:
			r = comments(video_id=video_id,token=r["nextPageToken"],parent_id=parent_id,channel_id=channel_id)
			T.append(r["items"])
			save_coms(clean_coms(T[-1]))
			t += 1
			#print(t)
		except KeyError:
			break
	return aplatir(T)
"""

def all_comments_and_replies(video_id=None,channel_id=None):
	a = all_comments(video_id=video_id,channel_id=channel_id)
	r = []
	t = 0
	for i in a:
		if i["snippet"]["totalReplyCount"] > 0:
			t+=1
			#print(t)
			r += all_comments(parent_id = i["id"])
	return a+r


def videos(channel_id=None,token=None,query=None):
	if token==None:
		token=""
	else:
		token = "&pageToken=" + token
	
	if channel_id == None:
		channel_id = ""
	else:
		channel_id = "&channelId=" + channel_id
	if query==None:
		query=""
	
	r = requests.get("https://www.googleapis.com/youtube/v3/search?key=" + getGoogleKey() + channel_id + token + query + "&part=snippet,id&maxResults=50").json()

	#save_videos(r["items"])

	return r

def all_videos(channel_id=None,query=None,max_videos=1000):
	r = videos(channel_id=channel_id,query=query)
	#print(r)
	while 'error' in r:
		print('error')
		r = videos(channel_id=channel_id,query=query)
	T = [r["items"]]
	for i in range(max_videos//50):
		try:
			r = videos(channel_id=channel_id,token=r["nextPageToken"],query=query)
			while 'error' in r:
				print('error')
				r = videos(channel_id=channel_id,token=r["nextPageToken"],query=query)
			T.append(r["items"])
		except KeyError:
			break
	return aplatir(T)

def traiter(Q):
	A = []
	t = 1
	n = 0
	t1 = time()
	for i in Q:
		print("Traitement de la video " + str(t) +"/" + str(len(Q)) + " en cours...")
		try:
			b = all_comments_and_replies(video_id=i["id"]["videoId"])
		except KeyError:
			b = []
			print("Erreur ici")
		n += len(b)
		print(str(len(b)) + " commentaires recuperes pour un total maintenant de " + str(n) )
		A += b
		t += 1
		
	t2 = time()
	print("Cela fait " + str(t2-t1) + "s pour recuperer " + str(n) + " commentaires, soit " + str(n/(t2-t1)) + " coms/s") 

	return A



def all_coms_channel(nprocs,channel_id):
	dd = all_videos(channel_id)
	S = []
	nombre = len(dd)
	for i in range(nprocs-1):
		S.append(dd[i*nombre//nprocs:(i+1)*nombre//nprocs])
	S.append(dd[(nprocs-1)*nombre//nprocs:])
	
	
	pool = mp.Pool(processes=nprocs)
	
	A = aplatir(pool.map(traiter, S))
	




	return clean_coms(A)


def clean_coms(coms,channelId):
	A = []
	for c in coms:
		#print(c)
		try:
			A.append({"id":c["id"],
					"kind":c["kind"],
					"authorId":c["snippet"]["authorChannelId"]["value"],
					"authorName":c["snippet"]["authorDisplayName"],
					"likeCount":c["snippet"]["likeCount"],
					"parentId":c["snippet"]["parentId"],
					"publishedAt":c["snippet"]["publishedAt"],
					"textDisplay":c["snippet"]["textDisplay"],
					"textOriginal":c["snippet"]["textOriginal"],
					"updatedAt":c["snippet"]["updatedAt"],
					"videoId":"nan",
					"channelId":"nan"})
		except KeyError:
			#try:
			A.append({"id":c["id"],
					"kind":c["kind"],
					"authorId":c["snippet"]["topLevelComment"]["snippet"]["authorChannelId"]["value"],
					"authorName":c["snippet"]["topLevelComment"]["snippet"]["authorDisplayName"],
					"likeCount":c["snippet"]["topLevelComment"]["snippet"]["likeCount"],
					"parentId":c["snippet"]["topLevelComment"]["id"],
					"publishedAt":c["snippet"]["topLevelComment"]["snippet"]["publishedAt"],
					"textDisplay":c["snippet"]["topLevelComment"]["snippet"]["textDisplay"],
					"textOriginal":c["snippet"]["topLevelComment"]["snippet"]["textOriginal"],
					"updatedAt":c["snippet"]["topLevelComment"]["snippet"]["updatedAt"],
					"videoId":c["snippet"]["videoId"],
					"channelId":channelId,
					"replyCount":c["snippet"]["totalReplyCount"]})
		#except KeyError:
			#	print(c)
	return A


def get_videos(publishedAfter=None,publishedBefore=None,channelId=None,location=None,locationRadius=None,words=None,regionCode=None,relevanceLanguage=None,topicId=None,max_videos=1000):
	if publishedAfter==None:
		publishedAfter = ""
	else:
		publishedAfter = "&publishedAfter="+publishedAfter
		
	if publishedBefore==None:
		publishedBefore = ""
	else:
		publishedBefore = "&publishedBefore="+publishedBefore
		
	if channelId==None:
		channelId = ""
	else:
		channelId = "&channelId="+channelId
		
	if location==None:
		location = ""
	else:
		location = "&location="+location
		
	if locationRadius==None:
		locationRadius = ""
	else:
		locationRadius = "&locationRadius="+locationRadius
		
	if words==None:
		words = ""
	else:
		words = "&q="+words
		
	if regionCode==None:
		regionCode = ""
	else:
		regionCode = "&regionCode="+regionCode
		
	if relevanceLanguage==None:
		relevanceLanguage = ""
	else:
		relevanceLanguage = "&relevanceLanguage="+relevanceLanguage
		
	if topicId==None:
		topicId = ""
	else:
		topicId = "&topicId="+topicId
	
	
	query = "&safeSearch=none&type=video"+publishedAfter+publishedBefore+channelId+location+locationRadius+words+regionCode+relevanceLanguage+topicId
	return all_videos(query=query,max_videos=max_videos)
	


def video(video_id):
	r = requests.get("https://www.googleapis.com/youtube/v3/videos?key=" + getGoogleKey() + "&id="+video_id +   "&part=snippet,id,topicDetails,contentDetails,recordingDetails,statistics,status").json()
	print("https://www.googleapis.com/youtube/v3/videos?key=" + getGoogleKey() + "&id="+video_id +   "&part=snippet,id,topicDetails,contentDetails,recordingDetails,statistics,status")
	return r










def save_coms(coms):
	for comment in coms:

		replieshasChanged=True

		if not(User.objects.filter(userId=comment["authorId"],channelId=comment["channelId"]).exists()):
			user = User(userId=comment["authorId"],userName=comment["authorName"],channelId=comment["channelId"])
			user.save()
		else:
			user = User.objects.filter(userId=comment["authorId"],channelId=comment["channelId"])[0]

		if not(Comment.objects.filter(commentId=comment["id"]).exists()):
			c = Comment(commentId=comment["id"],author=user,kind=comment["kind"],likeCount=int(comment["likeCount"]),publishedAt=comment["publishedAt"],updatedAt=comment["updatedAt"],textOriginal=comment["textOriginal"],textDisplay=comment["textDisplay"],videoId=comment["videoId"],channelId=comment["channelId"])
			c.save()
			treat_comment(c)
			if comment["videoId"] == "nan":
				replieshasChanged=False
				if Comment.objects.filter(commentId=comment["parentId"]).exists():
					pere = Comment.objects.filter(commentId=comment["parentId"])[0]
					c.parentCom=pere
					c.videoId=pere.videoId
					c.channelId=pere.channelId
					c.save()
					treat_comment(c)
				else:
					c.delete()
		else:
			c = Comment.objects.get(commentId=comment["videoId"])
			replieshasChanged = (True)
			c.commentId=c.comment["id"]
			c.author=user
			c.kind=comment["kind"]
			c.likeCount=int(comment["likeCount"])
			c.publishedAt=comment["publishedAt"]
			c.updatedAt=comment["updatedAt"]
			c.textOriginal=comment["textOriginal"]
			c.textDisplay=comment["textDisplay"]
			c.videoId=comment["videoId"]
			c.channelId=comment["channelId"]
			c.save()
			treat_comment(c)

		if replieshasChanged:
			all_comments(parent_id=c.commentId)













def save_video(result):

	video_id=result["id"]["videoId"]
	json=video(video_id)
	commentsHaveEvolved=True
	try:
		item=json["items"][0]
	except KeyError:
		with open(os.path.join(BASE_DIR, "logs.txt"),"a") as file:
			file.write("\n")
			file.write(str(json))
			return False
	kind=item["kind"]
	videoId=item["id"]
	snippet=item["snippet"]
	#print(snippet)
	channelId=snippet["channelId"]
	title=snippet["title"]
	description=snippet["description"].replace("\n"," ").replace("\r"," ").replace(","," ").replace("\t"," ").replace('"'," ")
	try:
		thumbnail=snippet["thumbnails"]["standard"]["url"]
	except KeyError:
		thumbnail= "nan"
	try:
		tags = snippet["tags"]
	except KeyError:
		tags=None
	categoryId=snippet["categoryId"]
	publishedAt=snippet["publishedAt"]
	try:
		defaultLanguage=snippet["defaultLanguage"]
	except KeyError:
		defaultLanguage=None
	content=item["contentDetails"]
	liste=content["duration"]
	duration=isodate.parse_duration(liste).total_seconds()
	definition=content["definition"]
	stats = item["statistics"]
	viewCount = stats["viewCount"]
	try:
		likeCount = stats["likeCount"]
	except KeyError:
		likeCount=0
	try:
		dislikeCount= stats["dislikeCount"]
	except KeyError:
		dislikeCount=0
	try:
		favoriteCount = stats["favoriteCount"]
	except KeyError:
		favoriteCount=0
	try:
		commentCount = stats["commentCount"]
	except KeyError:
		commentCount = 0
	if not(Video.objects.filter(videoId=video_id).exists()):
		v = Video(publishedAt=publishedAt,kind=kind,videoId=videoId,channelId=channelId,title=title,description=description,thumbnail=thumbnail,tags=tags,categoryId=categoryId,defaultLanguage=defaultLanguage,duration=duration,definition=definition,viewCount=viewCount,likeCount=likeCount,favoriteCount=favoriteCount,commentCount=commentCount,dislikeCount=dislikeCount)
		v.save()
		treat_video(v)
	else:
		v = Video.objects.filter(videoId=video_id)[0]
		with conection.cursor() as cursor:
			cursor.execute(""" SELECT COUNT(*) FROM dashboard_comment where "videoId"='{}' """.format(v.videoId))
			row = cursor.fetchall()
		commentsHaveEvolved= (row[0][0]==commentCount)
		v.publishedAt=publishedAt
		v.kind=kind
		v.videoId=videoId
		v.channelId=channelId
		v.title=title
		v.description=description
		v.thumbnail=thumbnail
		v.tags=tags
		v.categoryId=categoryId
		v.defaultLanguage=defaultLanguage
		v.duration=duration
		v.definition=definition
		v.viewCount=viewCount
		v.likeCount=likeCount
		v.favoriteCount=favoriteCount
		v.commentCount=commentCount
		v.dislikeCount=dislikeCount
		v.save()
		treat_video(v)


	
	return commentsHaveEvolved




def all_comments(video_id=None,parent_id=None,channel_id=None):
	r = comments(video_id=video_id,parent_id=parent_id,channel_id=None)
	try:
		save_coms(clean_coms(r["items"],channel_id))

		while True:
			try:
				r = comments(video_id=video_id,token=r["nextPageToken"],parent_id=parent_id,channel_id=None)
				
				save_coms(clean_coms(r["items"],channel_id))
			except KeyError:
				break
		#print(video_id)
	except KeyError:
		#print(video_id)
		return None


def updateComs(videoId,channelId):
	return all_comments(video_id=videoId,channel_id=channelId)


def update_vid(l):
	try:
		for name, info in django.db.connections.databases.items(): # Close the DB connections
			django.db.connection.close()
		v = l[0]
		channelId=l[1]
		commentshaveEvolved = save_video(v)
		if commentshaveEvolved:
			updateComs(videoId=v["id"]["videoId"],channelId=channelId)
			print(v["id"]["videoId"])
		else:
			print(v["id"]["videoId"])

	except:
		print('%s: %s' % (v["id"]["videoId"], traceback.format_exc()))


def update_vids(l):
	for i in l:
		update_vid(i)





def calculFeatures(channelId):
	#ls = ChannelToListen.objects.get(channelId=channelId)
	print("Features utilisateurs...")
	#calculVideosCommentees(channelId)
	#userLinks(channelId)
	print("Features videos...")
	#videoLinks(channelId)

	#averageUserVideoCount(channelId)
	videoGraph,videoTab,videoDic = createVideoGraph(channelId=channelId)
	userGraph,userTab,userDic = createUserGraph(channelId=channelId)
	date = datetime.datetime.now()
	c = ChannelToListen.objects.get(channelId=channelId)
	c.listeningTime = str(date)
	c.save()	

	calculUserFeatures(channelId,userGraph,userTab,userDic,date)
	calculVideoFeatures(channelId,videoGraph,videoTab,videoDic,date)


 
def save_channel(channelId):
	c = get_object_or_404(ChannelToListen,channelId=channelId)
	r = requests.get("https://www.googleapis.com/youtube/v3/channels?key="+ getGoogleKey() + "&part=snippet,id,topicDetails,contentDetails,statistics,status&id=" + str(channelId)).json()
	items=r["items"]
	c.description=items[0]["snippet"]["description"].replace("\n"," ").replace("\r"," ").replace(","," ").replace("\t"," ").replace('"'," ")
	c.creationTime=items[0]["snippet"]["publishedAt"]
	stats = items[0]["statistics"]
	c.viewCount=stats["viewCount"]
	c.subscriberCount=stats["subscriberCount"]
	c.videoCount=stats["videoCount"]
	c.save()
 
 
 
def updateChannel(channelId):
	
	save_channel(channelId=channelId)
	c = get_object_or_404(ChannelToListen,channelId=channelId)
	if c.listening==True:
		return None
	else:
		
		c.listening=True
		c.save()
		t1 = time()
		print("Récupération des vidéos...")
		vids=[[i,channelId] for i in get_videos(channelId=channelId)]
		print(len(vids))
		t2 =time()
		print(t2-t1)
		print("Découpage en processus...")
		
		for i in range(len(vids)//NB_PROC_MAX+1):
			print(i)
			pool = mp.Pool(processes=NB_PROC_MAX)
			r = pool.map_async(update_vid,vids[i*NB_PROC_MAX:(i+1)*NB_PROC_MAX])
			print(i)
			with conection.cursor() as cursor:
				cursor.execute("""SELECT count(*) FROM dashboard_comment """)
				row = cursor.fetchall()
			number = row[0][0]



			t0 = time()
			while (r.ready()==False):
				with conection.cursor() as cursor:
					cursor.execute("""SELECT count(*) FROM dashboard_comment """)
					row = cursor.fetchall()
				print(r.ready())
				sleep(1)
				if int(row[0][0]) == number:
					pool.terminate()
				else:
					number = int(row[0][0])
				print(number)
			
			pool.close()
			pool.join() 
			#return updateChannel(channelId)

		#with conection.cursor() as cursor:
		#	cursor.execute("""SELECT COUNT(*) FROM dashboard_comment WHERE "channelId"='{}' """.format(channelId))
		#	row = cursor.fetchall()
		#c.commentsCount = row[0][0]
		#c.save()

		t3 = time()
		print(t3-t2)
		print("Calcul des features...")
		calculFeatures(channelId=channelId)
		print(time()-t3)
		c = get_object_or_404(ChannelToListen,channelId=channelId)
		c.listening=False
		c.save()
		return None


def updateAll(request):
	for c in ChannelToListen.objects.all():
		updateChannel(c.channelId)

	#channelLinks()
	return HttpResponse("c'est bon")


def successful(r):
	try:
		t = r.successful()
	except AssertionError:
		t = False
	return t

def startSearch(keywords,nbvideos,date):
	nbvideos=int(nbvideos)
	date = date.split("/")
	print(date)
	date = datetime.datetime(int(date[2]),int(date[0]),int(date[1]))
	search = Search(maxDate=date,keywords=keywords)
	search.save()
	date = date.isoformat() + "Z"
	words = keywords.replace(" ","+")
	t1 = time()
	print("Récupération des vidéos...")
	vids=[[i,i["snippet"]["channelId"]] for i in get_videos(words=words,max_videos=nbvideos,publishedAfter=date)]
	for i in vids:
		videoId = i[0]["id"]["videoId"]
		r=RelationVideoSearch(search=search,videoId=videoId)
		r.save()
	print(len(vids))
	t2 =time()
	print(t2-t1)
	print("Découpage en processus...")
	
	pool = mp.Pool(processes=NB_PROC_MAX)
	pool.map(update_vids,[vids[i*NB_PROC_MAX:(i+1)*NB_PROC_MAX] for i in range(len(vids)//NB_PROC_MAX+1)])
	pool.close()
	pool.join()



	"""
		continu = True
		while continu:
			print(i)

			pool = mp.Pool(processes=NB_PROC_MAX)
			print("starting pool...")
			r = pool.map_async(update_vid,vids[i*NB_PROC_MAX:(i+1)*NB_PROC_MAX])
			print(i)
			
			t0 = time()
			ttt = successful(r)
			while (time()-t0) < 40 and ttt==False:
				ttt = successful(r)
				print(ttt)
				sleep(1)
			if ttt==False:
				print("terminate")
				pool.terminate()
				continu=True
			if ttt:
				print(ttt)
				print("wait")
				print(successful(r))
				print("closing..")
				pool.terminate() 
				continu = False
			
			pool.join() 
	"""

	t3 = time()
	print(t3-t2)


def saveSearch(searchId):

	videoReq = """ SELECT dashboard_video.id,dashboard_video."videoId",dashboard_video."publishedAt",dashboard_video."channelId",dashboard_video."title",dashboard_video."description",dashboard_video."categoryId",dashboard_video."defaultLanguage",dashboard_video.duration,dashboard_video.definition,dashboard_video."viewCount",dashboard_video."likeCount",dashboard_video."dislikeCount",dashboard_video."favoriteCount",dashboard_video."commentCount",dashboard_relationvideosearch.search_id from dashboard_video INNER JOIN dashboard_relationvideosearch ON dashboard_video."videoId" = dashboard_relationvideosearch."videoId" WHERE dashboard_relationvideosearch.search_id = {} """.format(searchId)

	commentReq = """ SELECT dashboard_comment."id",dashboard_comment."author_id",dashboard_comment."commentId",dashboard_comment."likeCount",dashboard_comment."parentCom_id",dashboard_comment."publishedAt",dashboard_comment."textDisplay",dashboard_comment."videoId",dashboard_comment."channelId",dashboard_comment."replyCount",dashboard_relationvideosearch.search_id FROM dashboard_comment 
	INNER JOIN dashboard_video ON dashboard_comment."videoId"=dashboard_video."videoId" 
	INNER JOIN dashboard_relationvideosearch on dashboard_video."videoId"=dashboard_relationvideosearch."videoId" 
	where dashboard_relationvideosearch.search_id = {} """.format(searchId)

	userReq = """ SELECT dashboard_user.id,dashboard_user."userId",dashboard_user."userName" FROM dashboard_user
	INNER JOIN dashboard_comment ON dashboard_user.id = dashboard_comment.author_id 
	INNER JOIN dashboard_video ON dashboard_comment."videoId"=dashboard_video."videoId" 
	INNER JOIN dashboard_relationvideosearch on dashboard_video."videoId"=dashboard_relationvideosearch."videoId" 
	where dashboard_relationvideosearch.search_id = {} """.format(searchId)


	videohyperlinksReq = """ SELECT dashboard_videodeschyperlink.id,dashboard_videodeschyperlink."videoId",dashboard_videodeschyperlink.url FROM dashboard_videodeschyperlink
	INNER JOIN dashboard_video ON dashboard_videodeschyperlink."videoId"=dashboard_video."videoId" 
	INNER JOIN dashboard_relationvideosearch on dashboard_video."videoId"=dashboard_relationvideosearch."videoId" 
	where dashboard_relationvideosearch.search_id = {} """.format(searchId)


	commenthyperlinksReq = """ SELECT dashboard_commenttexthyperlink.id,dashboard_commenttexthyperlink."commentId",dashboard_commenttexthyperlink.url FROM dashboard_commenttexthyperlink
	INNER JOIN dashboard_comment ON dashboard_commenttexthyperlink."commentId" = dashboard_comment."commentId"
	INNER JOIN dashboard_video ON dashboard_comment."videoId"=dashboard_video."videoId" 
	INNER JOIN dashboard_relationvideosearch on dashboard_video."videoId"=dashboard_relationvideosearch."videoId" 
	where dashboard_relationvideosearch.search_id = {} """.format(searchId)


	"""
	for v in Video.objects.all():
		
		
		treat_video(v)
		v.title = v.title.replace("\n"," ").replace("\r"," ").replace(","," ").replace("\t"," ").replace('"'," ")
		v.save()

	A = 0
	N = len(Comment.objects.all())
	for c in Comment.objects.all():
		A += 1
		print("État d'avancement : {} / {}".format(A,N))
		

		
		treat_comment(c)
	"""
	date = datetime.datetime.now()


	with conection.cursor() as cursor:
		cursor.execute(videoReq)
		row = cursor.fetchall()
	video_df = pd.DataFrame(row)
	video_df.columns = ["id","videoId","publishedAt","channelId","title","description","categoryId","defaultLanguage","duration","definition","viewCount","likeCount","dislikeCount","favoriteCount","commentCount","search_id"]
	
	video_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_videos_export"  + ".csv",index=False)

	with conection.cursor() as cursor:
		cursor.execute(commentReq)
		row = cursor.fetchall()
	video_df = pd.DataFrame(row)
	video_df.columns = ["id","author_id","commentId","likeCount","parentCom_id","publishedAt","textDisplay","videoId","channelId","replyCount","search_id"]
	video_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_comments_export"  + ".csv",index=False)


	with conection.cursor() as cursor:
		cursor.execute(userReq)
		row = cursor.fetchall()
	video_df = pd.DataFrame(row)
	video_df.columns = ["id","userId","userName"]
	video_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_users_export"  + ".csv",index=False)


	with conection.cursor() as cursor:
		cursor.execute(videohyperlinksReq)
		row = cursor.fetchall()
	video_df = pd.DataFrame(row)
	video_df.columns = ["id","videoId","url"]
	video_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_videohyperlinks_export"  + ".csv",index=False)

	with conection.cursor() as cursor:
		cursor.execute(commenthyperlinksReq)
		row = cursor.fetchall()
	video_df = pd.DataFrame(row)
	video_df.columns = ["id","commentId","url"]
	video_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_commenthyperlinks_export"  + ".csv",index=False)

	with conection.cursor() as cursor:
		cursor.execute("""SELECT dashboard_video."videoId",dashboard_video.description FROM dashboard_video JOIN dashboard_relationvideosearch ON dashboard_video."videoId"=dashboard_relationvideosearch."videoId" WHERE dashboard_relationvideosearch.search_id='{}' """.format(searchId))
		row = cursor.fetchall()
	args=pd.DataFrame(row)
	args.columns=["videoId","description"]
	words,videoTopicLinks,wordLinks = textTopicsExtraction(args)

	print("words...")

	words_df = pd.DataFrame(words)
	words_df.columns = ["id","words"]
	words_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_topics_export"  + ".csv",index=False)

	print("videolinks...")

	videoTopicLinks_df = pd.DataFrame(videoTopicLinks)
	videoTopicLinks_df.columns = ["source","target","weight"]
	videoTopicLinks_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_videotopiclinks_export"  + ".csv",index=False)

	print("wordlink")

	wordLinks_df = pd.DataFrame(wordLinks)
	wordLinks_df.columns = ["source","target","weight"]
	wordLinks_df.to_csv(BASE_DIR+"/neo4j/import/data_exports/" + str(searchId)  + "_" + str(date).replace(" ","_") + "_wordlinks_export"  + ".csv",index=False)

	return str(searchId)  + "_" + str(date).replace(" ","_")




def importNeo4J(searchId):
	chemin = saveSearch(searchId)

	print("Sauvegarde terminée")
	print("Export Neo4J")

	videosPath = "file:///data_exports/" + chemin + "_videos_export"  + ".csv"
	usersPath = "file:///data_exports/" + chemin + "_users_export"  + ".csv"
	commentsPath = "file:///data_exports/" + chemin + "_comments_export"  + ".csv"
	videohyperlinksPath =  "file:///data_exports/" + chemin + "_videohyperlinks_export"  + ".csv"
	commenthyperlinksPath = "file:///data_exports/" + chemin + "_commenthyperlinks_export"  + ".csv"
	topicsPath = "file:///data_exports/" + chemin + "_topics_export"  + ".csv"
	videoTopicLinksPath = "file:///data_exports/" + chemin + "_videotopiclinks_export"  + ".csv"
	wordLinksPath = "file:///data_exports/" + chemin + "_wordlinks_export"  + ".csv"

	code = ["""match (n) detach delete n""",


		""" LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		CREATE (u:Tempuser) SET u=row""".format(usersPath),

		"""MATCH (u:Tempuser)
		WITH DISTINCT u.userId as userId, u.userName as userName
		CREATE (r:User) SET r.userId = userId""",

		"""MATCH (u:Tempuser),(r:User)
		WHERE u.userId=r.userId
		SET r.userName = u.userName""",


		"""LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		CREATE (v:Video) SET v=row""".format(videosPath),



		"""LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		CREATE (c:Comment) SET c=row""".format(commentsPath),



		"""LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		CREATE (c:CommentHyperLink) SET c=row""".format(commenthyperlinksPath),

		"""LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		CREATE (c:VideoHyperLink) SET c=row""".format(videohyperlinksPath),


		"""LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		CREATE (t:Topic) SET t=row""".format(topicsPath),

		"""LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		MATCH (v1:Video),(v2:Video)
		WHERE v1.videoId = row.source AND v2.videoId = row.target
		CREATE (v1)-[r:videoTopicLink]->(v2)
		SET r.weight = row.weight
		""".format(videoTopicLinksPath),


		"""LOAD CSV WITH HEADERS FROM "{}" AS row 
		FIELDTERMINATOR ',' 
		MATCH (t1:Topic),(t2:Topic)
		WHERE t1.id = row.source AND t2.id = row.target
		CREATE (t1)-[r:topicLink]->(t2)
		SET r.weight = row.weight
		""".format(wordLinksPath),


		"""MATCH (c:CommentHyperLink)
		WITH collect(c.url) AS curl 
		MATCH (v:VideoHyperLink)
		WITH curl + collect(v.url) AS urls
		UNWIND urls AS url
		WITH DISTINCT url
		CREATE (u:Url) SET u.url = url""",

		"""
		MATCH (l:CommentHyperLink),(u:Url),(c:Comment)
		WHERE l.url = u.url AND c.commentId=l.commentId
		CREATE (c)-[:quote]->(u)
		""",

		"""
		MATCH (l:VideoHyperLink),(u:Url),(c:Video)
		WHERE l.url = u.url AND c.VideoId=l.VideoId
		CREATE (c)-[:quote]->(u)
		""",



		"""MATCH (u:Tempuser),(c:Comment)
		WHERE c.author_id = u.id
		SET c.userId=u.userId""",

		"""MATCH (v:Video)
		WITH DISTINCT v.channelId as channelId
		CREATE (t:Tempuser) 
		SET t.userId=channelId""",




		"""MATCH (u:User),(c:Comment)
		WHERE u.userId = c.userId
		CREATE (u)-[:hasWritten]->(c)""",



		"""MATCH (c:Comment),(v:Video)
		WHERE c.videoId = v.videoId
		CREATE (c)-[:commentToVideo]->(v)""",



		"""MATCH (c1:Comment),(c2:Comment)
		WHERE c1.parentCom_id = c2.id and NOT c1.parentCom_id = c1.id
		CREATE (c1)-[:repliesTo]->(c2)""",




		"""MATCH (u:User),(v:Video)
		WHERE u.userId = v.channelId
		CREATE (v)-[:videoPublishedBy]->(u)""",



		"""MATCH (u1:User)-[:hasWritten]->(:Comment)-[:repliesTo]->(:Comment)<-[:hasWritten]-(u2:User)
		CREATE (u1)-[l:userLink]->(u2)
		SET l.Weight=1""",

		"""MATCH (u1:User)-[:hasWritten]->(:Comment)-[:commentToVideo]->(:Video)-[:videoPublishedBy]->(u2:User)
		CREATE (u1)-[l:userLink]->(u2)
		SET l.Weight=1""",

		"""CALL algo.pageRank('User', 'userLink', {write:true,iterations:20,writeProperty:'hierarchicPageRank'});""",

		"""CALL algo.pageRank('Video', 'videoTopicLink', {write:true,iterations:20,writeProperty:'videoTopicPageRank'});""",

		"""CALL algo.pageRank('Topic', 'topicLink', {write:true,iterations:20,writeProperty:'topicPageRank'})"""

		]


	gdb = GraphDatabase("http://localhost:7474/db/data/")
	for q in code:
		print(q)
	for q in code:
		print(q)
		gdb.query(q = q)

	return True









def lookForVideo(videoId):
	b = Video.objects.filter(videoId=videoId).exists()
	if b:
		return True
	else:
		v = video(videoId)
		channelId = v["items"][0]["snippet"]["channelId"]
		result={"id":{"videoId":videoId}}
		update_vid([result,channelId])
		return True









