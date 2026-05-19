from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.generic.websocket import WebsocketConsumer
import json
import random
import string

otp_store = {}
def generate_otp():
    """Generate a random 4-digit OTP."""
    return ''.join(random.choices(string.digits, k=4))
class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Each connection will have its own channel_name
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'signaling_{self.room_name}'

        # Join the room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        await self.send(text_data=json.dumps({
            'message': 'Connected successfully.',
            'channel_name': self.channel_name
        }))

    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)

        # When sender sends file and requests an OTP
        if 'request_otp' in data:
            otp = generate_otp()
            otp_store[otp] = self.channel_name
            await self.send(text_data=json.dumps({
                'otp': otp,
                'message': 'OTP generated. Share with the receiver.'
            }))

        # When receiver enters the OTP
        elif 'otp' in data:
            otp = data['otp']

            if otp in otp_store:
                sender_channel = otp_store[otp]
                # del otp_store[otp]

                # Notify the sender that the receiver is ready
                await self.channel_layer.send(sender_channel, {
                    'type': 'peer_ready',
                    'receiver_channel': self.channel_name
                })
            else:
                await self.send(text_data=json.dumps({
                    'error': 'Invalid OTP. Please try again.'
                }))

        # When WebRTC signaling (SDP offer/answer, ICE candidates) is exchanged
        elif 'target' in data:
            target_channel = data['target']
            signal_data = data['signal']

            # Relay the signaling data to the target peer
            
            await self.channel_layer.group_send(
            
            self.room_group_name,  
            {
                'type': 'webrtc.signal',
                'signal': data['signal']
            })
            # await self.channel_layer.send(target_channel, {
            #     'type': 'webrtc.signal',
            # 'signal': data['signal']
            # })
        
        else:
            # Handle case where no 'target' is specified
            self.close(code=4000) 
    
    async def webrtc_signal(self, event):
        signal = event['signal']
        
        # Send signaling data back to WebSocket
        await self.send(text_data=json.dumps({
            'signal': signal
        }))

    async def peer_ready(self, event):
        receiver_channel = event['receiver_channel']

        # Notify the sender to start WebRTC connection with the receiver
        await self.send(text_data=json.dumps({
            'message': 'Receiver is ready. Starting WebRTC connection.',
            'receiver_channel': receiver_channel
        }))

    async def signal_relay(self, event):
        signal_data = event['signal']

        # Send signaling data to the peer
        await self.send(text_data=json.dumps({
            'signal': signal_data
        }))