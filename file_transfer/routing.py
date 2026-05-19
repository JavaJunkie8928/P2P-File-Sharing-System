from django.urls import re_path
from file_transfer.consumers import SignalingConsumer
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

websocket_urlpatterns = [
   

     re_path(r'ws/signal/(?P<room_name>\w+)/$', SignalingConsumer.as_asgi()),

]




# application = ProtocolTypeRouter({
#     'websocket': AuthMiddlewareStack(
#         URLRouter([
#             path('ws/file_transfer/<str:room_code>/', FileTransferConsumer.as_asgi()),
#         ])
#     ),
# })