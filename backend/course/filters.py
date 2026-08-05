import django_filters
from .models import Enrollment

class EnrollmentFilter(django_filters.FilterSet):
    course = django_filters.NumberFilter(field_name="course_id")

    class Meta:
        model = Enrollment
        fields = ["course"]