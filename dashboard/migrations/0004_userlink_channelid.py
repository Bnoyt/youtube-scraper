# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2018-07-13 08:58
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0003_comment_replycount'),
    ]

    operations = [
        migrations.AddField(
            model_name='userlink',
            name='channelId',
            field=models.CharField(default='nan', max_length=100),
        ),
    ]
