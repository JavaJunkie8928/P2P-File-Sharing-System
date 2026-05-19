from django.shortcuts import render, redirect
from .models import Room
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404
from .models import FileShare
from django.views.decorators.csrf import csrf_exempt
from channels.generic.websocket import WebsocketConsumer
import json
import random



def index(request):
    return render(request, 'index.html')

def download(request ):
    return render(request, 'download.html' )
# def index(request, room_name):
#     return render(request, 'index.html', {
#         'room_name': room_name
#     })

# def download(request, room_name):
#     return render(request, 'download.html', {'room_name': room_name})