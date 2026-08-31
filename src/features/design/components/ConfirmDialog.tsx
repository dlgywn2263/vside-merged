"use client";

// 경로: src/features/design/components/ConfirmDialog.tsx
//
// window.confirm 을 대체한다.
//
// 기존 설계 화면은 삭제 확인을 전부 네이티브 confirm 으로 처리했다. 앱의
// 다른 곳은 radix 다이얼로그와 토스트를 쓰는데 설계 화면만 브라우저 기본
// 창이 떠서 눈에 띄게 튀었고, 무엇보다 confirm 은 화면을 통째로 멈춰서
// 실시간 편집 중에는 팀원의 변경도 함께 멈춘 것처럼 보인다.

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Resolver = (confirmed: boolean) => void;

interface ConfirmState extends ConfirmOptions {
  resolve: Resolver;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(
  null,
);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback(
    (confirmed: boolean) => {
      setPending((current) => {
        current?.resolve(confirmed);
        return null;
      });
    },
    [],
  );

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{pending?.title}</DialogTitle>
            {pending?.description ? (
              <DialogDescription>{pending.description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {pending?.cancelLabel ?? "취소"}
            </Button>
            <Button
              variant={pending?.destructive ? "destructive" : "default"}
              onClick={() => close(true)}
            >
              {pending?.confirmLabel ?? "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/** 확인이 필요할 때 await 로 쓴다. 취소하면 false 가 온다. */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("ConfirmDialogProvider 안에서만 사용할 수 있습니다.");
  }

  return confirm;
}
