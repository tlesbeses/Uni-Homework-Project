import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { joinCourseSchema } from "@/features/courses/schemas/courseSchemas";
import { joinCourseByCode } from "@/features/courses/services/courseService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useJoinCourseForm = ({ onSuccess } = {}) => {
    // Sections of the course matching the submitted code. The backend
    // returns them when joining without a section, so the student can
    // pick one and submit again.
    const [pendingSections, setPendingSections] = useState(null);
    const [selectedSectionId, setSelectedSectionId] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(joinCourseSchema),
        defaultValues: { join_code: "" },
    });

    const onSubmit = async (data) => {
        if (pendingSections && !selectedSectionId) {
            toast.error("Selecciona una sección para continuar");
            return;
        }

        try {
            await joinCourseByCode(data.join_code, selectedSectionId || undefined);
            toast.success("Solicitud de inscripción enviada");
            reset();
            setPendingSections(null);
            setSelectedSectionId("");
            onSuccess?.();
        } catch (error) {
            const availableSections = error?.response?.data?.available_sections;
            if (Array.isArray(availableSections) && availableSections.length > 0) {
                setPendingSections(availableSections);
                setSelectedSectionId("");
                toast.info("Este curso tiene varias secciones. Selecciona una.");
            } else {
                setPendingSections(null);
                toast.error(getErrorMessage(error));
            }
        }
    };

    return {
        register,
        handleSubmit,
        errors,
        isSubmitting,
        onSubmit,
        pendingSections,
        selectedSectionId,
        setSelectedSectionId,
    };
};
