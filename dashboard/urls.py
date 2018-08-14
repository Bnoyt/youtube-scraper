from django.conf.urls import url
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^import/$', views.import_data, name='import'),
    url(r'^delete_all/$', views.delete_all, name='delete_all'),
    url(r'^calcul_videos_commentees/$', views.videosCommentees, name='calcul_videos_commentees'),
	url(r'^calcul_liens/$', views.liens, name='calcul_liens'),
	url(r'^autoconfig/$', views.autoconfig, name='autoconfig'),
	url(r'^update_all/$', views.updateAll, name='update_all'),
	url(r'^search/$', views.search, name='search'),
	url(r'^ajout_search/$', views.ajout_search, name='ajout_search'),
	url(r'^save_search/$', views.save_search, name='save_search'),
	url(r'^export_neo4j/$', views.export_neo4j, name='export_neo4j'),
	url(r'^topics/$', views.detect_topics, name='detect_topics'),
	url(r'^videotopics/$', views.detect_videotopics, name='detect_videotopics'),
	url(r'^videosearch/$', views.videosearch, name='videosearch'),

]