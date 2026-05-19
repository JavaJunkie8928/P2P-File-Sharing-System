from django.db import models
import random

# Create your models here.
import uuid

class Room(models.Model):
    room_code = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class FileShare(models.Model):
    code = models.CharField(max_length=4, unique=True)
    file = models.FileField(upload_to='shared_files/')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = '{:04d}'.format(random.randint(0, 9999))  # Generate a 4-digit code
        super().save(*args, **kwargs)