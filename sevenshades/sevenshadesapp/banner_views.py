import logging
from rest_framework.decorators import api_view
from django.core.files.storage import default_storage
from django.shortcuts import render
from django.http.response import JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework import status
from sevenshadesapp.models import Banner
from sevenshadesapp.serializer import BannerSerializer

from .upload_security import sanitize_filename

logger = logging.getLogger(__name__)


def Upload_Files(files):
     iconname=[]
     for uploaded_file in files.getlist('icon'):
          safe_name = sanitize_filename(uploaded_file.name, fallback_ext='.jpg')
          file_path = default_storage.save('static/' + safe_name, uploaded_file)
          iconname.append(file_path[7:] if file_path.startswith('static/') else file_path)
     return ",".join(iconname)


@api_view(['POST'])
def Banner_Submit(request):
    saved_files = []
    try:
        bannerdescription = request.data.get('bannerdescription', '').strip()
        if not bannerdescription:
            return JsonResponse({"message": 'Banner description is required.', "status": False}, status=400)

        uploaded_files = request.FILES.getlist('icon')
        if not uploaded_files:
            return JsonResponse({"message": 'Please select at least 1 image.', "status": False}, status=400)
        if len(uploaded_files) > 10:
            return JsonResponse({"message": 'Upload at most 10 images at a time.', "status": False}, status=400)

        iconname = []
        for uploaded_file in uploaded_files:
            safe_name = sanitize_filename(uploaded_file.name, fallback_ext='.jpg')
            file_path = default_storage.save('static/' + safe_name, uploaded_file)
            saved_files.append(file_path)
            iconname.append(file_path[7:] if file_path.startswith('static/') else file_path)

        payload = {
            'bannerdescription': bannerdescription,
            'icon': ",".join(iconname)
        }
        banner_serializer = BannerSerializer(data=payload)
        if banner_serializer.is_valid():
            banner_serializer.save()
            return JsonResponse({"message": 'Banner Submitted Successfully', "status": True}, safe=False)
        else:
            for path in saved_files:
                try: default_storage.delete(path)
                except Exception: pass
            first_err = next(iter(banner_serializer.errors.values()), ['Please check banner input fields.'])
            msg = first_err[0] if isinstance(first_err, list) and first_err else 'Please check banner input fields.'
            return JsonResponse({"message": str(msg), "status": False, "errors": banner_serializer.errors}, status=400)
    except Exception as e:
        for path in saved_files:
            try: default_storage.delete(path)
            except Exception: pass
        logger.exception("Error in Banner_Submit: %s", e)
        return JsonResponse({"message": 'Fail to submit banner.', "status": False}, status=500)