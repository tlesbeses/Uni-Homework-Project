from django.db import migrations

def create_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")

    Group.objects.get_or_create(name="Student")
    Group.objects.get_or_create(name="Teacher")
    Group.objects.get_or_create(name="Admin")


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_groups),
    ]