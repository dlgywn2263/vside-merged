// 폼 입력 필드 공통 레이아웃 컴포넌트
// label + input/textarea/select 묶음용

export function DevlogField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
