from django.db import models
from django.contrib.postgres.fields import ArrayField
import datetime
import django.utils.timezone


class User(models.Model):
	userId = models.CharField(max_length=100)
	userName = models.CharField(max_length=100)
	nbvideoscommentees=models.IntegerField(default=0)
	nbLikes=models.IntegerField(default=0)
	channelId=models.CharField(max_length=100)

	def __str__(self):
		return str(self.userId)





class Comment(models.Model):
	author=models.ForeignKey(User)
	commentId = models.CharField(max_length=100)
	kind = models.CharField(max_length=100)
	likeCount= models.IntegerField()
	parentCom=models.ForeignKey('self', null=True, related_name='pere',blank=True)
	publishedAt =models.DateTimeField()
	textDisplay=models.TextField()
	textOriginal=models.TextField()
	updatedAt=models.DateTimeField()
	videoId=models.CharField(max_length=100)
	channelId=models.CharField(max_length=100)
	replyCount=models.IntegerField(default=0)

	def __str__(self):
		return str(self.commentId)


class GoogleKey(models.Model):
	value=models.CharField(max_length=100)

	def __str__(self):
		return self.value


class Channel(models.Model):
	name=models.CharField(max_length=100)
	channelId=models.CharField(max_length=100)
	listening=models.BooleanField(default=False)
	creationTime=models.DateTimeField(auto_now_add=True)
	description=models.TextField(default="nan")
	viewCount=models.IntegerField(default=0)
	subscriberCount=models.IntegerField(default=0)
	videoCount=models.IntegerField(default=0)
	commentsCount=models.IntegerField(default=0)


	def __str__(self):
		return self.name






class Video(models.Model):
	videoId=models.CharField(max_length=100)
	kind=models.CharField(max_length=100)
	publishedAt=models.DateTimeField()
	channelId=models.CharField(max_length=100)
	title=models.CharField(max_length=200)
	description=models.TextField()
	thumbnail=models.CharField(max_length=100)
	tags=ArrayField(models.CharField(max_length=100),null=True,blank=True)
	categoryId=models.IntegerField()
	defaultLanguage=models.CharField(max_length=100,null=True,blank=True)
	duration=models.IntegerField()
	definition=models.CharField(max_length=100)
	viewCount=models.IntegerField()
	likeCount=models.IntegerField()
	dislikeCount=models.IntegerField()
	favoriteCount=models.IntegerField()
	commentCount=models.IntegerField()

	def __str__(self):
		return self.title





class Search(models.Model):
	keywords=models.CharField(max_length=300)
	maxDate=models.DateTimeField()
	
class RelationVideoSearch(models.Model):
	videoId = models.CharField(max_length=100)
	search = models.ForeignKey(Search)

class RelationChannelSearch(models.Model):
	channelId = models.CharField(max_length=100)
	search = models.ForeignKey(Search)
	chosen=models.BooleanField()




class VideoDescHyperLink(models.Model):
	videoId = models.CharField(max_length=100)
	url = models.CharField(max_length=500)


class CommentTextHyperLink(models.Model):
	commentId = models.CharField(max_length=100)
	url = models.CharField(max_length=500)