"""Permission classes for the grading application.

Read access is scoped through querysets in ``views.py`` (students only see
``student=request.user``, teachers only ``assignment__course__teacher=request.user``).
The write endpoints reuse the existing teacher-of-course rule defined by the
assignments app to authorize who may grade.
"""

from assignments.permissions import IsCourseTeacher


class IsCourseTeacherOfAssignment(IsCourseTeacher):
    """Allow grading an assignment only to the teacher that owns its course.

    The ownership check (``assignment.course.teacher_id == request.user.id``)
    is inherited from ``assignments.permissions.IsCourseTeacher``.
    """
