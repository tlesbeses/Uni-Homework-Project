import os

from django.core.management.base import BaseCommand
from authentication.models import User


class Command(BaseCommand):
    help = "Create or update the admin superuser from environment variables"

    def handle(self, *args, **options):
        username = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin")
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "")

        if not email or not password:
            self.stderr.write(
                "ERROR: DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD "
                "must be set as environment variables."
            )
            return

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_superuser": True, "is_staff": True},
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created.'))
        else:
            updated = False
            if user.email != email:
                user.email = email
                updated = True
            if not user.check_password(password):
                user.set_password(password)
                updated = True
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                updated = True
            if updated:
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Superuser "{username}" updated.')
                )
            else:
                self.stdout.write(
                    f'Superuser "{username}" already exists and is up to date.'
                )
