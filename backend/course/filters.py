import django_filters
from .models import Enrollment, Section


class EnrollmentFilter(django_filters.FilterSet):
    course = django_filters.NumberFilter(field_name="section__course_id")
    section = django_filters.NumberFilter(field_name="section_id")

    class Meta:
        model = Enrollment
        fields = ["course", "section"]


class SectionFilter(django_filters.FilterSet):
    course = django_filters.NumberFilter(field_name="course_id")

    class Meta:
        model = Section
        fields = ["course"]
