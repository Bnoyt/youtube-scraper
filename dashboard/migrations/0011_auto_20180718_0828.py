# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-07-18 08:28
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0010_auto_20180717_1327'),
    ]

    operations = [
        migrations.AddField(
            model_name='channelfeatures',
            name='averagePathLength',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='channelfeatures',
            name='diameter',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='videofeatures',
            name='SBMClass',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='videofeatures',
            name='betweennessCentrality',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='videofeatures',
            name='closenessCentrality',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='videofeatures',
            name='degree',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='videofeatures',
            name='harmonicClosenessCentrality',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='videofeatures',
            name='louvainClass',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='videofeatures',
            name='pageRank',
            field=models.FloatField(default=0),
        ),
        migrations.AlterField(
            model_name='channelfeatures',
            name='commentsCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='channelfeatures',
            name='subscriberCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='channelfeatures',
            name='videoCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='channelfeatures',
            name='viewCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='videofeatures',
            name='commentCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='videofeatures',
            name='dislikeCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='videofeatures',
            name='favoriteCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='videofeatures',
            name='likeCount',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='videofeatures',
            name='viewCount',
            field=models.IntegerField(default=0),
        ),
    ]
