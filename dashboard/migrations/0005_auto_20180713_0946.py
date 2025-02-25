# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-07-13 09:46
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0004_userlink_channelid'),
    ]

    operations = [
        migrations.CreateModel(
            name='VideoFeatures',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('channelId', models.CharField(max_length=100)),
                ('videoId', models.CharField(max_length=100)),
                ('timeStamp', models.DateTimeField(auto_now_add=True)),
                ('viewCount', models.IntegerField()),
                ('likeCount', models.IntegerField()),
                ('dislikeCount', models.IntegerField()),
                ('favoriteCount', models.IntegerField()),
                ('commentCount', models.IntegerField()),
            ],
        ),
        migrations.AddField(
            model_name='user',
            name='channelId',
            field=models.CharField(default='nan', max_length=100),
            preserve_default=False,
        ),
    ]
