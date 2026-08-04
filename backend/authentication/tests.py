from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase

User = get_user_model()


class UserEmailTests(TestCase):
    def test_multiple_users_without_email_can_be_created(self):
        user1 = User.objects.create_user(username="student1", password="pass12345")
        user2 = User.objects.create_user(username="student2", password="pass12345")

        self.assertIsNone(user1.email)
        self.assertIsNone(user2.email)

    def test_user_with_blank_email_is_normalized_to_null(self):
        user = User.objects.create_user(
            username="student1",
            password="pass12345",
            email="",
        )

        user.refresh_from_db()
        self.assertIsNone(user.email)

    def test_email_must_still_be_unique_when_provided(self):
        User.objects.create_user(
            username="student1",
            password="pass12345",
            email="student@example.com",
        )

        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                username="student2",
                password="pass12345",
                email="student@example.com",
            )
