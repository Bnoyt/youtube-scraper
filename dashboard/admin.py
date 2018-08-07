from django.contrib import admin
from .models import *
from django.apps import apps


# Register your models here.
app = apps.get_app_config('dashboard')
for model_name, model in app.models.items():
	admin.site.register(model)


class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'userId', 'userName','nbvideoscommentees' ]
    search_fields = ['userName']

admin.site.unregister(User)
admin.site.register(User, UserAdmin)

class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'videoId', 'channelId']
    search_fields = ['author__userId']

admin.site.unregister(Comment)
admin.site.register(Comment, CommentAdmin)

class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'videoId', 'channelId',"title","duration","viewCount","likeCount","publishedAt"]
    search_fields = ['title']

admin.site.unregister(Video)
admin.site.register(Video, VideoAdmin)