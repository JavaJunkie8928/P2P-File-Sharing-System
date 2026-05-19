from django.urls import path
from . import views

urlpatterns = [
    # path('index/<str:room_name>/', views.index, name='index'),
    # path('download/<str:room_name>/', views.download, name='downlaod'),
    path('', views.index, name='index'),
    path('download/', views.download, name='download'),
  
]


