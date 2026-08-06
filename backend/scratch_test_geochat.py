import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.geochat.services.chat import chat

try:
    print("Testing chat...")
    answer, hist = chat("Hello", history=None)
    print("ANSWER:", answer)
except Exception as e:
    import traceback
    traceback.print_exc()
