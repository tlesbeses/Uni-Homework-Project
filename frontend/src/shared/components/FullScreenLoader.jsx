export const FullScreenLoader = ({ message = "Cargando tu sesión..." }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#312e81]">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-white/10 mb-5">
                <span className="text-[28px] font-black text-white tracking-tight">
                    EN
                </span>
            </div>
            <span className="text-[22px] font-bold tracking-wide text-white">
                EduNotas
            </span>
            <div className="mt-5 flex items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
                <span className="text-sm text-white/80">{message}</span>
            </div>
        </div>
    );
};
