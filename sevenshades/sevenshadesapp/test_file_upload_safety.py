"""Unit tests for upload security, file validation, storage isolation, and execution prevention."""
import tempfile
import os
from io import BytesIO
from pathlib import Path
from PIL import Image
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APIRequestFactory

from sevenshadesapp.models import AdminLogin
from sevenshadesapp.upload_security import (
    validate_uploaded_image,
    sanitize_filename,
    secure_media_serve,
    MAX_FILE_SIZE,
)


class FileUploadSafetyTests(TestCase):
    def setUp(self):
        self.media_temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_temp.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media_temp.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

        self.client = APIClient(enforce_csrf_checks=True)
        self.admin = AdminLogin.objects.create(
            emailid='upload_admin@example.test',
            mobileno='9000000088',
            password='AdminPassword123!'
        )
        self.client.post('/api/check_admin_login', {'emailid': self.admin.emailid, 'password': 'AdminPassword123!'})

    def make_image_file(self, filename='valid.png', fmt='PNG', size=(10, 10), color='red', extra_bytes=b'', content_type='image/png'):
        buf = BytesIO()
        Image.new('RGB', size, color).save(buf, format=fmt)
        data = buf.getvalue() + extra_bytes
        return SimpleUploadedFile(filename, data, content_type=content_type)

    def test_valid_png_and_jpeg_and_webp_accepted(self):
        png = self.make_image_file('valid.png', 'PNG', content_type='image/png')
        self.assertEqual(validate_uploaded_image(png), [])

        jpg = self.make_image_file('valid.jpg', 'JPEG', content_type='image/jpeg')
        self.assertEqual(validate_uploaded_image(jpg), [])

        webp = self.make_image_file('valid.webp', 'WEBP', content_type='image/webp')
        self.assertEqual(validate_uploaded_image(webp), [])

    def test_empty_file_rejected(self):
        empty = SimpleUploadedFile('empty.png', b'', content_type='image/png')
        errors = validate_uploaded_image(empty)
        self.assertTrue(any('empty' in e.lower() for e in errors))

    def test_oversized_file_rejected(self):
        huge_bytes = b'a' * (MAX_FILE_SIZE + 1024)
        oversized = SimpleUploadedFile('huge.png', huge_bytes, content_type='image/png')
        errors = validate_uploaded_image(oversized)
        self.assertTrue(any('5 mb' in e.lower() or 'exceeds' in e.lower() for e in errors))

    def test_non_image_disguised_as_image_rejected(self):
        fake = SimpleUploadedFile('malicious.png', b'not an image binary content', content_type='image/png')
        errors = validate_uploaded_image(fake)
        self.assertTrue(len(errors) > 0)
        self.assertTrue(any('magic bytes' in e.lower() or 'valid' in e.lower() for e in errors))

    def test_dangerous_extensions_rejected(self):
        for dang in ('shell.php', 'exploit.py', 'test.sh', 'virus.exe', 'page.html', 'script.js', 'image.svg'):
            f = SimpleUploadedFile(dang, b'\x89PNG\r\n\x1a\nfake', content_type='image/png')
            errors = validate_uploaded_image(f)
            self.assertTrue(len(errors) > 0, f"Expected {dang} to be rejected")
            self.assertTrue(any('not allowed' in e.lower() or 'only jpg' in e.lower() or 'suspicious' in e.lower() for e in errors))

    def test_double_extension_rejected(self):
        f = SimpleUploadedFile('shell.php.png', b'\x89PNG\r\n\x1a\nfake', content_type='image/png')
        errors = validate_uploaded_image(f)
        self.assertTrue(any('suspicious' in e.lower() or 'double extension' in e.lower() for e in errors))

    def test_path_traversal_in_filename_rejected(self):
        for bad_name in ('.._.._etc_passwd.jpg', 'subdir/test.png', 'folder\\test.png'):
            f = SimpleUploadedFile(bad_name, b'test', content_type='image/jpeg')
            errors = validate_uploaded_image(f)
            self.assertTrue(len(errors) > 0)

    def test_polyglot_script_tag_rejected(self):
        php_tag = b'<' + b'?php ' + b'echo "hello"; ' + b'?' + b'>'
        polyglot = self.make_image_file('polyglot.jpg', 'JPEG', extra_bytes=php_tag, content_type='image/jpeg')
        errors = validate_uploaded_image(polyglot)
        self.assertTrue(any('disallowed script' in e.lower() for e in errors))

    def test_polyglot_html_script_tag_rejected(self):
        script_tag = b'<' + b'script>console.log(1);</' + b'script>'
        polyglot = self.make_image_file('xss.png', 'PNG', extra_bytes=script_tag, content_type='image/png')
        errors = validate_uploaded_image(polyglot)
        self.assertTrue(any('disallowed script' in e.lower() for e in errors))

    def test_mismatched_magic_bytes_and_extension_rejected(self):
        buf = BytesIO()
        Image.new('RGB', (10, 10), 'green').save(buf, format='PNG')
        mismatched = SimpleUploadedFile('trick.jpg', buf.getvalue(), content_type='image/jpeg')
        errors = validate_uploaded_image(mismatched)
        self.assertTrue(len(errors) > 0)
        self.assertTrue(any('mismatched' in e.lower() or 'png' in e.lower() for e in errors))

    def test_sanitize_filename_strips_path_and_dangerous_chars(self):
        self.assertEqual(sanitize_filename('../../evil.png'), 'evil.png')
        self.assertEqual(sanitize_filename('..\\windows\\cmd.exe.jpg'), 'cmd_exe.jpg')
        self.assertEqual(sanitize_filename('shirt,blue(1).png'), 'shirt_blue_1_.png')
        self.assertEqual(sanitize_filename('file with spaces.png'), 'file_with_spaces.png')
        self.assertEqual(sanitize_filename('.png'), 'upload.png')

    def test_secure_media_serve_prevents_code_execution_and_enforces_headers(self):
        media_dir = Path(self.media_temp.name)
        img_path = media_dir / 'test_banner.jpg'
        buf = BytesIO()
        Image.new('RGB', (20, 20), 'yellow').save(buf, format='JPEG')
        img_path.write_bytes(buf.getvalue())

        factory = APIRequestFactory()
        req = factory.get('/media/test_banner.jpg')
        response = secure_media_serve(req, 'test_banner.jpg')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/jpeg')
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertIn("sandbox", response['Content-Security-Policy'])
        self.assertIn("default-src 'none'", response['Content-Security-Policy'])
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        response.close()

    def test_secure_media_serve_blocks_path_traversal_and_non_images(self):
        factory = APIRequestFactory()

        # Path traversal
        req = factory.get('/media/../secret.txt')
        response = secure_media_serve(req, '../secret.txt')
        self.assertEqual(response.status_code, 403)

        # Non-image file attempt
        secret_file = Path(self.media_temp.name) / 'config.ini'
        secret_file.write_text('token=123')
        req2 = factory.get('/media/config.ini')
        response2 = secure_media_serve(req2, 'config.ini')
        self.assertEqual(response2.status_code, 403)
