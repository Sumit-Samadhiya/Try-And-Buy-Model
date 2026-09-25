from rest_framework import serializers


class SendOtpSerializer(serializers.Serializer):
    phone = serializers.RegexField(r'^[6-9][0-9]{9}$', max_length=10, min_length=10, trim_whitespace=True)


class VerifyOtpSerializer(SendOtpSerializer):
    otp = serializers.RegexField(r'^[0-9]{6}$', max_length=6, min_length=6)
