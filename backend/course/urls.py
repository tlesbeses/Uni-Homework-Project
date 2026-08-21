from rest_framework.routers import DefaultRouter

from course.views import CourseViewSet, EnrollmentViewSet, SectionViewSet

router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("sections", SectionViewSet, basename="section")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = router.urls
